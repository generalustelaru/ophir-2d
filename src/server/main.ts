import {
    AuthenticatedClientRequest, AuthenticationForm, CookieArgs, CookieName, Probable, RegistrationForm,
    GameState, UserId, User, UserSession, GameFeed, LobbyAction, GameStatus, UserInvolvement, UserReference,
} from '~/server_types';
import { ServerMessage, PlayState, Action, ClientRequest, Phase, Player, PlayerDraft, PlayerEntity } from '~/shared_types';
import { validator } from './services/validation/ValidatorService';
import express, { Request, Response } from 'express';
import { DatabaseService } from './services/DatabaseService';
import { WebSocketServer, WebSocket } from 'ws';
import { Game } from './Game';
import sLib from './server_lib';
import readline from 'readline';
import process from 'process';
import path from 'path';
import http from 'http';

import { SERVER_ADDRESS, PORT_NUMBER, DB_PORT } from '../environment';
import { MongoClient } from 'mongodb';

if (!SERVER_ADDRESS || !PORT_NUMBER || !DB_PORT) {
    console.error('Missing environment variables', {
        SERVER_ADDRESS, PORT_NUMBER, DB_PORT,
    });
    process.exit(1);
}

let dbService: DatabaseService;
const dbClient = new MongoClient(`mongodb://localhost:${DB_PORT}`);

dbClient.connect().then(() => {
    const db = dbClient.db('ophir');
    dbService = new DatabaseService(db);
    startGameChecks();
    console.info('Connected to MongoDB');
}).catch(error => {
    sLib.printError(sLib.getErrorBrief(error));
    sLib.printError('Could not establish DB connection.');
    process.exit(1);
});

// MARK: PROCESS
process.on('SIGINT', () => {
    broadcast({ error: 'The server encountered an issue and is shutting down :(' });
    socketServer.close();
    console.log('Exiting...');
    process.exit(1);
});

// MARK: CLI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

(
    function promptForInput(): void {
        rl.question('\nophir-2d :: ', (input) => {
            const [command, target, option] = input.split(' ');
            switch (command) {
                case 'shut':
                    shutDown();
                    return;

                case 'debug':
                    debugCommand(target, option);
                    break;

                default:
                    console.error('\n\x1b[91m ¯\\_(ツ)_/¯ \x1b[0m', input);
                    break;
            }

            promptForInput();
        });
    }
)();
// MARK: MEMORY
// TODO: have sessions available independently in Redis
const sessions: Map<string, UserSession> = new Map();
const connections: Map<UserId, Connection> = new Map();
const activeGames: Map<GameId, Game> = new Map();
const stats: Map<GameId, GameStats> = new Map();

// MARK: WEB
const app = express();
const server = http.createServer(app);
server.timeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 0;
const socketServer = new WebSocketServer({ server, path: '/game' });

// MARK: WS
type GameId = string
type Connection = {
    socket: WebSocket
    gameId: GameId
}

socketServer.on('connection', async (socket, inc) => {
    const params = inc.url ? new URL(inc.url, `http://${inc.headers.host}`).searchParams : null;
    const gameId = params?.get('gameId');

    if (!gameId){
        sLib.printError('WS connection did not provide gameId.');
        transmit(socket, { error: 'Invalid connection data.' });

        return;
    }

    const game = activeGames.get(gameId);

    if (!game) {
        sLib.printWarning('WS requested inexistent play session.');
        transmit(socket, { notFound: null });

        return;
    }

    const validation = await validateClient(inc.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        transmit(socket, { expired: null });

        return;
    }

    if (!validation.data) {
        transmit(socket, { expired: null });

        return;
    }
    const { expiresAt, ...user } = validation.data;
    const ref = game.getPlayerRef(user.id);

    if (!ref) {
        game.setPlayerRef({ ...user });
    } else if (ref.color) {
        transmit(socket, { color: ref.color });
        transmit(socket, { vp: game.getPlayerVP(ref.color) });
        // TODO: if it's the active player also send turn notification and start idle timeout
    }

    connections.set(user.id, { gameId, socket });
    updateGameStat(gameId);
    transmit(socket, { state: game.getSharedState() });

    socket.on('message', function incoming(req: string) {
        const clientRequest = validator.validateClientRequest(JSON.parse(req));

        if (!clientRequest)
            return transmit(socket, { error: 'Invalid request data.' });

        if (expiresAt <= Date.now())
            return transmit(socket, { expired: null });

        logRequest(clientRequest, user.name);

        if (clientRequest.message.action == Action.declare_reset) {
            dbService.getConfig().then(configuration => {
                if (configuration.err)
                    return console.error(configuration.message);

                game.updateConfig(configuration.data);
                processAction(game, { ...clientRequest, userId: user.id }, socket);
            });
        } else {
            processAction(game, { ...clientRequest, userId: user.id }, socket);
        }
    });
    socket.on('close', (code) => {
        sLib.printWarning(`Connection closed for ${user.id}, code: ${code}`);
        handleDisconnection(user.id, gameId);
    });

    socket.on('error', (error) => {
        sLib.printError(`WebSocket failed: ${JSON.stringify({ id: user.id, error })}`);
        handleDisconnection(user.id, gameId);
    });
});

// MARK: HTTP
app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});
app.get('/probe', (req: Request, res: Response) => {
    console.info('Server probed', { ip: req.ip });
    res.status(200).send('SERVER OK');
});
app.get('/feed', async (req: Request, res: Response) => {
    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        res.status(401).send();
        return;
    }

    const feed = composeLobbyFeed(validation.data.id);

    res.status(200).json(feed);
});
app.get('/', async (req: Request, res: Response) => {
    const validation = await validateClient(req.headers.cookie);

    if (stats.size == 0) {
        await initializeStats();
    }

    if (validation.ok) {
        res.sendFile(path.join(__dirname,'public', 'lobby.html'));
    } else {
        res.sendFile(path.join(__dirname,'public', 'index.html'));
    }
});
app.use(express.urlencoded({ extended: true }));
app.post('/register', async (req: Request, res: Response) => {
    const form = req.body as RegistrationForm;

    const validation = await dbService.validateRegistrationInput(form);

    if (validation.err) {
        sLib.printError(validation.message);
        res.status(400).send('Your account could not be created.');

        return;
    }

    const validity = validation.data;

    if (validity.invalid) {
        res.status(401).send(validity.reason);

        return;
    }

    const registration = await dbService.registerUser(form);

    if (registration.err) {
        sLib.printError(registration.message);
        res.status(400).send('Your account could not be created.');

        return;
    }

    const cookies = sLib.produceCookieArgs(false);
    const sessionOp = await enableSession(cookies, registration.data);

    if (sessionOp.err) {
        sLib.printError(sessionOp.message);
        res.status(500).send('Something went wrong.');

        return;
    }

    console.info('New registration',{ userName: form.userName });

    for (const cookieName in cookies) {
        const { value, options } = cookies[cookieName as CookieName];
        res.cookie(cookieName, value, options);
    }

    res.status(200).send();
});
app.post('/login', async (req: Request, res: Response) => {
    const form = req.body as AuthenticationForm;
    const authentication = await dbService.authenticateUser(form);

    if (authentication.err) {
        sLib.printError(authentication.message);
        res.status(400).send('Authentication failed.');

        return;
    }

    const cookies = sLib.produceCookieArgs(false);
    const user = authentication.data;
    const sessionOp = await enableSession(cookies, user);

    if (sessionOp.err) {
        sLib.printError(sessionOp.message);
        res.status(500).send('Something went wrong.');

        return;
    }

    console.info('User logged in',{ userName: user.name });

    for (const cookieName in cookies) {
        const { value, options } = cookies[cookieName as CookieName];
        res.cookie(cookieName, value, options);
    }

    res.status(200).send();
});
app.get('/lobby', async (req: Request, res: Response) => {
    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        res.redirect('/');

        return;
    }

    if (!validation.data) {
        res.redirect('/');

        return;
    }

    res.sendFile(path.join(__dirname,'public', 'lobby.html'));
});
app.get('/logout', async (req: Request, res: Response) => {
    clearSession(req.headers.cookie);
    res.status(200).send();
});
app.get('/new', async (req: Request, res: Response) => {
    console.info('Visitor calls for new session', { ip: req.ip });

    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        res.redirect('/');

        return;
    }

    const instantiation = await produceGame();

    if (instantiation.err) {
        sLib.printError(instantiation.message);
        res.status(500).send('Server has encountered a problem :(');

        return;
    }

    const { data: game } = instantiation;

    const gameId = game.getGameId();
    activeGames.set(gameId, game);
    await updateGameStat(gameId);
    res.redirect(`/${gameId}`);
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/:id', async (req: Request, res: Response) => {
    const gameId = req.params.id;
    console.info('Visitor requests session', { ip: req.ip, gameId });

    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        res.redirect('/');

        return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (activeGames.has(gameId)) {
        res.sendFile(path.join(__dirname,'public', 'game.html'));

        return;
    }

    const revival = await reviveGame(gameId);

    if (revival.err) {
        sLib.printError(revival.message);
        res.sendFile(path.join(__dirname,'public', 'lobby.html'));

        return;
    }

    activeGames.set(gameId, revival.data);
    await updateGameStat(gameId);

    res.sendFile(path.join(__dirname,'public', 'game.html'));
});
server.listen(PORT_NUMBER, () => {
    console.info(`Listening on http://${SERVER_ADDRESS}:${PORT_NUMBER}`);
});

async function processAction(
    game: Game,
    request: AuthenticatedClientRequest,
    socket: WebSocket,
) {
    const gameId = game.getGameId();
    const result = game.processAction(request);

    const statsRelevant: Array<Action> = [
        Action.end_turn, Action.enrol, Action.change_color, Action.force_turn, Action.start_setup,
    ];

    if (statsRelevant.includes(request.message.action)) {
        const save = await dbService.saveGameState(game.getGameState());

        if (save.err) {
            console.error(save.message);
            return broadcastToGroup(gameId, { error: 'Action cannot be saved' });
        }

        updateGameStat(gameId);
    }

    result.senderOnly
        ? transmit(socket, result.message)
        : broadcastToGroup(gameId, result.message)
    ;
}

// MARK: CALLBACKS
function broadcastCallback(state: PlayState) {
    broadcastToGroup(state.gameId, { state });
}

function transmitCallback(userId: UserId, message: ServerMessage) {
    const reference = connections.get(userId);

    if (!reference)
        return console.error('Cannot deliver message: Missing socket client.', { message });

    transmit(reference.socket, message);
}

async function nameUpdateCallback(userId: UserId, name: string) {
    const op = await dbService.updateUserDisplayName(userId, name);

    if (op.err)
        sLib.printError(op.message);
}

// MARK: FUNCTIONS

function logRequest(request: ClientRequest, userName: string) {
    const { message } = request;
    const { action, payload } = message;

    console.info(
        '%s -> %s : {%s}',
        userName,
        action || '?',
        payload ? ` ${JSON.stringify(payload)} ` : ' ',
    );
}
function debugCommand(target?: string, option?: string): void {

    if (!target)
        return console.error('\n\x1b[91m ¯\\_(ツ)_/¯ \x1b[0m');

    switch (target.trim()) {
        case 'games':
            return console.log(activeGames.keys());
        case 'sockets':
            return console.log(connections.keys());
        case 'sessions':
            return console.log(sessions.entries());
        case 'stats':
            return console.log(stats.entries());
    }

    if (!option)
        return console.log('\n\x1b[91m ¯\\_(ツ)_/¯ \x1b[0m');

    const game = activeGames.get(target);

    if (!game)
        return sLib.printWarning('Session does not exist or is not active');

    switch (option.trim()) {
        case 'refs':
            console.log(game.getAllRefs());
            break;
        case 'sockets':
            console.log(getGameConnections(target));
            break;
        default:
            break;
    }
}

function shutDown() {
    rl.close();
    console.log('Shutting down...');

    broadcast({ error: 'The server is entering maintenance.' });
    connections.forEach(ref => ref.socket.close(1000));

    setTimeout(() => {
        socketServer.close();
        console.log('Server off.');
        process.exit(0);
    }, 3000);
}

function broadcast(message: ServerMessage): void {
    connections.forEach(ref => {
        transmit(ref.socket, message);
    });
}

function transmit(socket: WebSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
}

function broadcastToGroup(gameId: string, message: ServerMessage): void {
    const playGroupIds = activeGames.get(gameId)?.getAllRefs().map(r => r.id);

    if (!playGroupIds)
        return console.error('Cannot find active GameSession', { gameId });

    for (const userId of playGroupIds) {
        const socket = connections.get(userId)?.socket;
        socket && transmit(socket, message);
    }
}

function startGameChecks() {
    const seconds = 1000;
    const minutes = 60 * seconds;
    const hours = 60 * minutes;

    setInterval(async () => {
        const config = await dbService.getConfig();

        if (config.err){
            sLib.printError(config.message);
            return;
        }

        const { GAME_PERSIST_HOURS: count } = config.data;

        const time = Date.now();

        stats.forEach(async (stat: GameStats, gameId) => {
            const { timeStamp } = stat;
            const elapsedTime = time - timeStamp;
            const persistence = count * hours;

            if (activeGames.has(gameId)) {

                if (getGameConnections(gameId).length == 0)
                    activeGames.delete(gameId);
                else
                    return;
            }

            if (elapsedTime > persistence) {

                const deletion = await dbService.deleteGameState(gameId);

                if (deletion.err) {
                    sLib.printError(deletion.message);
                    return;
                }

                await updateGameStat(gameId, true);
                console.info('deleted abandoned game', { gameId });
            }
        });
    }, 1 * minutes);
}

async function handleDisconnection(userId: UserId, gameId: GameId) {
    connections.delete(userId);

    let isRedundant = false;

    if (activeGames.has(gameId)) {
        const connectedUsers = getGameConnections(gameId);
        console.log('users connected to the same session:', connectedUsers);

        if (connectedUsers.length == 0) {
            const game = activeGames.get(gameId) as Game;
            isRedundant = game.getAllRefs().every(ref => ref.color == null);

            try {
                const operation = isRedundant
                    ? await dbService.deleteGameState(gameId)
                    : await dbService.saveGameState(game.getGameState());

                if (operation.ok) {
                    game.deReference();
                    activeGames.delete(gameId);
                    console.info(
                        isRedundant ? 'deleted redundant game' : 'deactivated stale game', { gameId },
                    );
                } else {
                    sLib.printError(operation.message);
                }
            } catch (error) {
                sLib.printError(sLib.getErrorBrief(error));
            }
        }
    }
    await updateGameStat(gameId, isRedundant);
}

async function produceGame(): Promise<Probable<Game>> {
    const instantiation = await getGameInstance(null);

    if (instantiation.err) {
        sLib.printError(instantiation.message);
        return sLib.fail('Could not create game session,');
    }

    const persistence = await dbService.addGameState(instantiation.data.getGameState());

    if (persistence.err) {
        sLib.printError(persistence.message);
        return sLib.fail('Could not persist game state');
    }

    return instantiation;
}

async function enableSession(
    cookies: Record<CookieName, CookieArgs>,
    user: User,
): Promise<Probable<Record<CookieName, CookieArgs>>> {

    const tokenCookie = cookies[CookieName.token];

    if (!tokenCookie.options.maxAge) {
        return sLib.fail('Token does not have maxAge set.');
    }
    const expiresAt = Date.now() + tokenCookie.options.maxAge;
    sessions.set( tokenCookie.value, { ...user, expiresAt });

    return sLib.pass(cookies);
}

async function reviveGame(gameId: string): Promise<Probable<Game>> {
    const revival = await dbService.loadGameState(gameId);

    if (revival.err) {
        sLib.printError(revival.message);

        return sLib.fail('Could not revive session');
    }

    const instantiation = await getGameInstance(revival.data);

    if (instantiation.err) {
        sLib.printError(instantiation.message);

        return sLib.fail('Could not instantiate session.');
    }

    return instantiation;
}

async function getGameInstance(savedSession: GameState | null): Promise<Probable<Game>> {
    const query = await dbService.getConfig();

    if (query.err) {
        sLib.printError(query.message);
        return sLib.fail('Could not retreive configuration');
    }

    try {
        const configuration = query.data;
        const session = new Game(
            broadcastCallback,
            transmitCallback,
            nameUpdateCallback,
            configuration,
            savedSession,
        );

        return sLib.pass(session);
    } catch (error) {
        sLib.printError(String(error));

        return sLib.fail('GameSession constructor threw.');
    }
}

function clearSession(cookie: unknown): void {
    const parsing = extractToken(cookie);
    parsing.ok && sessions.delete(parsing.data);
}
async function validateClient(cookie: unknown): Promise<Probable<UserSession>> {
    const parsing = extractToken(cookie);

    if (parsing.err)
        return sLib.fail(parsing.message);

    const token = parsing.data;
    const session = sessions.get(token);

    if (!session) {
        return sLib.fail('Session was wiped.');
    }

    if (session.expiresAt <= Date.now()) {
        sessions.delete(token);
        return sLib.fail('Session has expired');
    }

    return sLib.pass(session);
}

function extractToken(cookie: unknown): Probable<string> {
    if (typeof cookie != 'string') {
        return sLib.fail('No cookie found.');
    }

    const items = sLib.parseCookies(cookie);

    if (!('token' in items)) {
        return sLib.fail('Cookie might have expired.');
    }

    return sLib.pass(items.token);
}

type GameStats = {
    timeStamp: number
    isActiveGame: boolean
    userReferences: Array<UserReference>
    phase: Phase
    players: Array<PlayerEntity>
    activeCount: number
}

async function updateGameStat(gameId: GameId, toRemove: boolean = false): Promise<void> {
    if (toRemove) {
        stats.delete(gameId);
        return;
    }

    const { isActiveGame, gameState } = await (async (): Promise<{isActiveGame: boolean, gameState: GameState | null}> => {
        const isActiveGame = activeGames.has(gameId);

        if (isActiveGame)
            return { isActiveGame, gameState: activeGames.get(gameId)?.getGameState() || null };

        const gameFetch = await dbService.loadGameState(gameId);

        if (gameFetch.ok)
            return { isActiveGame, gameState: gameFetch.data };

        sLib.printError(gameFetch.message);
        return { isActiveGame, gameState: null };
    })();

    if (!gameState) {
        stats.delete(gameId);
        return;
    }

    const { sharedState, userReferences: userReferences, timeStamp } = gameState;
    const { sessionPhase: phase, players } = sharedState;
    const activeCount = (() => {
        const connections = getGameConnections(gameId);
        const activePlayers = userReferences.filter(
            ref => ref.color && connections.includes(ref.id),
        );
        return activePlayers.length;
    })();

    stats.set(
        gameId,
        { timeStamp, isActiveGame, userReferences: userReferences, phase, players, activeCount },
    );
}

async function initializeStats(): Promise<void> {
    console.info('Creating stats...');
    const gamesFetch = await dbService.loadAllGames();

    if (gamesFetch.err) {
        sLib.printError(gamesFetch.message);
        return;
    }

    const allGames = gamesFetch.data;

    for(const gameState of allGames) {
        const { sharedState, userReferences, timeStamp } = gameState;
        const { sessionPhase: phase, players, gameId } = sharedState;

        stats.set(
            gameId,
            { timeStamp, isActiveGame: false, userReferences, phase, players, activeCount: 0 },
        );
    };
}
function composeLobbyFeed(userId: UserId): Array<GameFeed> {
    const lobbyFeed = Array.from(stats).map(([gameId, stat]): GameFeed => {
        const { isActiveGame, userReferences, phase, players, activeCount, timeStamp } = stat;
        const userRef = userReferences.find(r => r.id == userId);
        const playerEntity = players.find(p => p.color == userRef?.color);

        const status: GameStatus = (() => {
            if (isActiveGame) {
                return phase == Phase.enrolment ? GameStatus.Enroling : GameStatus.Playing;
            }
            return GameStatus.Dormant;
        })();

        const action: LobbyAction | null = (() => {
            switch(true) {
                case !!playerEntity:
                    return LobbyAction.Continue;
                case isActiveGame:
                    return phase == Phase.enrolment ? LobbyAction.Join : LobbyAction.Spectate;
                default:
                    return null;
            }
        })();

        const userInvolvement: UserInvolvement= (() => {
            if (!playerEntity)
                return UserInvolvement.None;

            switch (phase) {
                case Phase.play:
                    const player = playerEntity as Player;
                    return player.isActive ? UserInvolvement.HasTurn : UserInvolvement.Playing;
                case Phase.setup:
                    const draft = playerEntity as PlayerDraft;
                    return draft.turnToPick ? UserInvolvement.HasTurn : UserInvolvement.Playing;
                default:
                    return UserInvolvement.Playing;
            }
        })();

        const activity = { enrolled: players.length, active: activeCount };

        return { timeStamp, gameId, action, activity, status, userInvolvement };
    });

    return lobbyFeed;
}

function getGameConnections(gameId: string): Array<UserId> {
    return Array.from(connections.entries())
        .filter(([, c]) => c.gameId == gameId)
        .map(([k]) => k);
}

