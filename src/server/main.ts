import {
    AuthenticatedClientRequest, AuthenticationForm, Configuration, CookieArgs, CookieName, Probable, RegistrationForm,
    GameState, UserId, User, UserSession, GameFeed, LobbyAction, GameStatus,
} from '~/server_types';
import { ServerMessage, PlayState, Action, ClientRequest } from '~/shared_types';
import { validator } from './services/validation/ValidatorService';
import express, { Request, Response } from 'express';
import dbService from './services/DatabaseService';
import { WebSocketServer, WebSocket } from 'ws';
import { Game } from './Game';
import sLib from './server_lib';
import readline from 'readline';
import process from 'process';
import path from 'path';
import http from 'http';

import { SERVER_ADDRESS, PORT_NUMBER, DB_PORT } from '../environment';

if (!SERVER_ADDRESS || !PORT_NUMBER || !DB_PORT) {
    console.error('Missing environment variables', {
        SERVER_ADDRESS, PORT_NUMBER, DB_PORT,
    });
    process.exit(1);
}

dbService.getConfig().then(configuration => {
    if (configuration.err){
        console.error(configuration.message);
        process.exit(1);
    }

    startGameChecks(configuration.data);
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
// TODO: have session data available independently in Redis
const sessions: Map<string, UserSession> = new Map();
const connections: Map<UserId, Connection> = new Map();
const activeGames: Map<GameId, Game> = new Map();

// MARK: WEB
const app = express();
const server = http.createServer(app);
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
        sLib.printError(validation.message);
        sLib.printError('WS connection has invalid cookie.');
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

    res.status(200).json(composeLobbyFeed());
});
app.get('/', async (req: Request, res: Response) => {
    const validation = await validateClient(req.headers.cookie);

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
        sLib.printError(validation.message);
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
        sLib.printError(validation.message);
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
    res.redirect(`/${gameId}`);
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/:id', async (req: Request, res: Response) => {
    const gameId = req.params.id;
    console.info('Visitor requests session', { ip: req.ip, gameId });

    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printError(validation.message);
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
        res.redirect('/new');

        return;
    }

    activeGames.set(gameId, revival.data);
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
    const result = game.processAction(request);

    if (request.message.action == Action.end_turn) {
        const save = await dbService.saveGameState(game.getGameState());

        if (save.err) {
            console.error(save.message);
            return broadcastToGroup(game.getGameId(), { error: 'Action cannot be saved' });
        }
    }

    result.senderOnly
        ? transmit(socket, result.message)
        : broadcastToGroup(game.getGameId(), result.message)
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
            console.log(
                Array.from(connections.entries())
                    .filter(([, c]) => c.gameId == target)
                    .map(([k]) => k),
            );
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

function startGameChecks(configuration: Configuration) {
    const { GAME_DELETION_HOURS } = configuration;
    console.info('Starting session checks');

    const minutes = 60000;
    setInterval(() => {
        // free memory
        connections.forEach(async (reference, userId) => {
            const { gameId, socket } = reference;

            if (socket.readyState == socket.CLOSED) {
                console.log('found CLOSED socket for', userId);
                connections.delete(userId);
                const game = activeGames.get(gameId);

                if (game) {
                    const connectedUsers = game
                        .getAllRefs()
                        .map( r => r.id)
                        .filter((userId: UserId) => {
                            connections.has(userId) && connections.get(userId)!.socket.OPEN;
                        });
                    console.log('users connected to the same session:', connectedUsers);

                    if (connectedUsers.length == 0) {
                        const saveOp = await dbService.saveGameState(game.getGameState());

                        if (saveOp.ok) {
                            game.deReference();
                            activeGames.delete(gameId);
                            console.info('deactivated empty session', { gameId });
                        } else {
                            console.error(saveOp.message);
                        }
                    }
                }
            }
        });
    }, 1 * minutes);

    const hours = 3600000;
    setInterval(() => {
        // free storage
        dbService.getTimestamps().then(timeStamps => {
            if (timeStamps.err)
                return console.error('Corrupt game record found in routine check.');

            const time = Date.now();

            for (const item of timeStamps.data) {
                if (time - item.timeStamp > (GAME_DELETION_HOURS * hours) && !activeGames.has(item.id)) {
                    dbService.deleteGameState(item.id).then(response => {

                        if (response.err)
                            return console.error(response.message);

                        console.info('deleted abandoned session', { gameId: item.id });
                    });
                }
            }
        });
    },1 * hours);
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
    console.info('Validating client');

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

    console.info('Session is ok.');
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

function composeLobbyFeed(): Array<GameFeed> {
    const data: Array<GameFeed> = [
        {
            gameId: 'fjw349fjsipfsefj98h44fjwhe8',
            action: LobbyAction.Return,
            players: 4,
            status: GameStatus.Playing,
            userInvolvement: 1,
        },
        {
            gameId: 'c6772d86-08e4-46cf-bd1c-553676e8122a',
            action: LobbyAction.Join,
            players: 1,
            status: GameStatus.Enroling,
            userInvolvement: 0,
        },
        {
            gameId: null,
        },
        {
            gameId: 'fjw349fjsipfsefj98h44fjwhe8',
            action: LobbyAction.Spectate,
            players: 3,
            status: GameStatus.Playing,
            userInvolvement: 0,
        },
        {
            gameId: 'fjw349fjsipfsefj98h44fjwhe8',
            action: LobbyAction.Return,
            players: 4,
            status: GameStatus.Dormant,
            userInvolvement: 2,
        },
        {
            gameId: 'fjw349fjsipfsefj98h44fjwhe8',
            action: null,
            players: 2,
            status: GameStatus.Dormant,
            userInvolvement: 0,
        },
    ];

    return data;
}

