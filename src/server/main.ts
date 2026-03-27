import {
    AuthenticatedClientRequest, AuthenticationForm, CookieName, Probable, RegistrationForm, Cookies, GameId,
    GameState, UserId, User, UserSession, GameFeed, LobbyAction, GameStatus, UserInvolvement, UserReference,
} from '~/server_types';
import {
    ServerMessage, State, Action, ClientRequest, Phase, Player, PlayerDraft, PlayerEntity, PlayerEntry,
} from '~/shared_types';
import { validator } from './services/validation/ValidatorService';
import express, { Request, Response } from 'express';
import { DatabaseService } from './services/DatabaseService';
import { SessionService } from './services/SessionService';
import { WebSocketServer, WebSocket } from 'ws';
import { Game } from './Game';
import sLib from './server_lib';
import process from 'process';
import path from 'path';
import http from 'http';

import { PORT_NUMBER, MONGODB_URI, REDIS_URL, NODE_ENV } from '../environment';
import { MongoClient } from 'mongodb';
import opentype, { Font } from 'opentype.js';

// MARK: STARTUP
if (!PORT_NUMBER || !MONGODB_URI || !REDIS_URL || !NODE_ENV) {
    console.error('❌ Missing environment variables', {
        PORT_NUMBER, MONGODB_URI, REDIS_URL, NODE_ENV,
    });
    process.exit(1);
}
// TODO: enclose this logic in a dbService.connect()
let dbService: DatabaseService;
const dbClient = new MongoClient(MONGODB_URI);

let fontCache: Font | null = null;
opentype.load(path.join(process.cwd(), 'dist/public', 'Laila-Regular.ttf')).then(font => {
    fontCache = font;
    console.info('✅ Fonts loaded.');
}).catch(error => {
    sLib.printError(String(error));
    console.error('❌ Could not load fonts.');
    process.exit(1);
});

dbClient.connect().then(async () => {
    const db = dbClient.db('ophir');
    dbService = new DatabaseService(db);
    console.info('✅ Connected to MongoDB');

    const seeding = await dbService.inspectAndSeed();

    if (seeding.err) {
        console.error('❌ Db could not be seeded.');
        process.exit(1);
    }

    if (seeding.data) console.info('✅ Db seeded succesfully.');

    await initializeStats();

    startGameChecks();
}).catch(error => {
    sLib.printError(sLib.getErrorBrief(error));
    console.info('❌ Db connection failed.');

    process.exit(1);
});
// Redis
const sessionService = new SessionService();
sessionService.connect();

process.on('SIGINT', () => {
    broadcast({ error: 'The server encountered an issue and is shutting down :(' });
    socketServer.close();
    console.log('Exiting...');
    process.exit(1);
});

// MARK: TYPES
declare module 'ws' {interface WebSocket { isAlive: boolean }}
type Connection = { isSwitching: boolean, socket: WebSocket }
type ActiveUser = Map<GameId, Connection>

// MARK: MEMORY
const activeUsers: Map<UserId, ActiveUser> = new Map();
const activeGames: Map<GameId, Game> = new Map();
const stats: Map<GameId, GameStats> = new Map();

// MARK: WEB
const app = express();
const server = http.createServer(app);
server.timeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 0;
const socketServer = new WebSocketServer({ server, path: '/game' });

// MARK: WEBSOCKET
socketServer.on('connection', async (socket: WebSocket, inc) => {
    const validation = await validateClient(inc.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        transmit(socket, { expired: null });

        return;
    }

    const params = inc.url ? new URL(inc.url, `http://${inc.headers.host}`).searchParams : null;
    const extraction = extractGameId(params?.get('gameId') || '');

    if (extraction.err) {
        sLib.printError(extraction.message);
        transmit(socket, { error: 'Invalid connection data.' });

        return;
    }

    socket.isAlive = true;
    const gameId = extraction.data;
    const game: Game | null = await (async () => {
        const activeGame = activeGames.get(gameId);

        if (activeGame)
            return activeGame;

        const activation = await activateGame(gameId);

        if (activation.ok) {
            sLib.printInfo(`Activated: [${gameId}]`);
            activeGames.set(gameId, activation.data);

            return activation.data;
        }

        sLib.printError(activation.message);

        return null;
    })();

    if (!game) {
        sLib.printWarning(`Could not find: [${gameId}]`);
        transmit(socket, { notFound: null });

        return;
    }

    const { expiresAt, ...user } = validation.data;
    const ref = (() => {
        const ref = game.getPlayerRef(user.id);

        if (!ref) {
            game.setPlayerRef({ ...user });

            return game.getPlayerRef(user.id)!;
        }

        if (ref.color) {
            transmit(socket, { color: ref.color });
            transmit(socket, { vp: game.getPlayerVP(ref.color) });
            game.handlePlayerReconnection(ref);
        }

        return ref;
    })();

    const activeUser = ((): Map<GameId, Connection> => {
        const activeUser = activeUsers.get(user.id);

        if (!activeUser) {
            const newActiveUser = new Map([[gameId, { isSwitching: false, socket }]]);
            activeUsers.set(user.id, newActiveUser);

            return newActiveUser;
        }

        const oldConnection = activeUser.get(gameId);

        if (!oldConnection) {
            activeUser.set(gameId, { isSwitching: false, socket });

            return activeUser;
        }

        const abandonedSocket = oldConnection.socket;
        oldConnection.socket = socket;
        oldConnection.isSwitching = true;
        transmit(abandonedSocket, { switch: null });

        return activeUser;
    })();

    updateGameStat(gameId);
    transmit(socket, { state: game.getSharedState() });

    sLib.printInfo(`[${user.name}] connected to [${gameId}]`);

    socket.on('message', function incoming(req: string) {
        const clientRequest = validator.validateClientRequest(JSON.parse(req));

        if (!clientRequest)
            return transmit(socket, { error: 'Invalid request data.' });

        if (expiresAt <= Date.now())
            return transmit(socket, { expired: null });

        NODE_ENV == 'development' && logRequest(clientRequest, user.name, gameId);

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
    socket.on('pong', () => {
        socket.isAlive = true;
    });
    socket.on('close', (_code) => {
        const connection = activeUser.get(gameId);

        if (connection?.isSwitching) {
            connection.isSwitching = false;
        } else {
            activeUser.delete(gameId);
        }

        setTimeout(() => {
            if (!activeUser.has(gameId)) {
                game.handlePlayerDisconnection(ref);
                handleDisconnection(game);
            }
        }, 1000);
    });

    socket.on('error', (error) => {
        sLib.printError(`WebSocket failed: ${JSON.stringify({ id: user.id, error })}`);
    });
});

// MARK: HTTP SERVER
app.set('trust proxy', 1); // trust first proxy (Nginx)
app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});
app.get('/about', (req: Request, res: Response) => {
    sLib.printInfo(`/about -> ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});
app.get('/how-to-play', (req: Request, res: Response) => {
    sLib.printInfo(`/how-to-play -> ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'how-to-play.html'));
});
app.get('/tutorial', (req: Request, res: Response) => {
    sLib.printInfo(`/tutorial -> ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});
app.get('/tutorial-data', (req: Request, res: Response) => {
    sLib.printInfo(`/tutorial-data -> ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'tutorial_data.json'));
});
app.get('/probe', (req: Request, res: Response) => {
    sLib.printInfo(`/probe -> ${req.ip}`);
    res.status(200).send('SERVER OK');
});
app.get('/feed', async (req: Request, res: Response) => {
    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        res.status(403).send();
        return;
    }

    const feed = composeLobbyFeed(validation.data.id);

    res.status(200).json(feed);
});
app.get('/', async (req: Request, res: Response) => {
    sLib.printInfo(`/ -> ${req.ip}`);
    const validation = await validateClient(req.headers.cookie);

    if (validation.ok) {
        res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});
app.get('/authentication', async (req: Request, res: Response) => {
    sLib.printInfo(`/authentication -> ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'authentication.html'));
});
app.use(express.urlencoded({ extended: true }));
app.post('/register', async (req: Request, res: Response) => {
    sLib.printInfo(`POST /register -> ${req.ip}`);
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
        sLib.printWarning(validity.reason);

        return;
    }

    const registration = await dbService.registerUser(form);

    if (registration.err) {
        sLib.printError(registration.message);
        res.status(400).send('Your account could not be created.');

        return;
    }

    const sessionOp = await enableSession(registration.data);

    if (sessionOp.err) {
        sLib.printError(sessionOp.message);
        res.status(500).send('Something went wrong.');

        return;
    }

    sLib.printInfo(`New user: [${form.userName}]`);

    for (const cookieName in sessionOp.data) {
        const { value, options } = sessionOp.data[cookieName as CookieName];
        res.cookie(cookieName, value, options);
    }

    res.status(200).send();
});
app.post('/authenticate', async (req: Request, res: Response) => {
    sLib.printInfo(`POST /authenticate -> ${req.ip}`);
    const form = req.body as AuthenticationForm;
    const authentication = await dbService.authenticateUser(form);

    if (authentication.err) {
        sLib.printError(authentication.message);
        res.status(400).send('Authentication failed.');

        return;
    }

    const user = authentication.data;
    const sessionOp = await enableSession(user);

    if (sessionOp.err) {
        sLib.printError(sessionOp.message);
        res.status(500).send('Something went wrong.');

        return;
    }

    sLib.printInfo(`[${user.name}] has logged in.`);

    for (const cookieName in sessionOp.data) {
        const { value, options } = sessionOp.data[cookieName as CookieName];
        res.cookie(cookieName, value, options);
    }

    res.status(200).send();
});
app.get('/lobby', async (req: Request, res: Response) => {
    sLib.printInfo(`/lobby -> ${req.ip}`);
    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        res.redirect('/');

        return;
    }

    res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
});
app.get('/logout', async (req: Request, res: Response) => {
    sLib.printInfo(`/logout -> ${req.ip}`);
    clearSession(req.headers.cookie);
    res.status(200).send();
});
app.get('/new', async (req: Request, res: Response) => {
    sLib.printInfo(`/new -> ${req.ip}`);

    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        res.redirect('/');

        return;
    }

    const instantiation = await createGame();

    if (instantiation.err) {
        sLib.printError(instantiation.message);
        res.status(500).send('Server has encountered a problem :(');

        return;
    }

    const { data: game } = instantiation;

    const gameId = game.getGameId();
    activeGames.set(gameId, game);

    res.redirect(`/game-${gameId}`);
});
app.post('/tutolytics/:step', (req: Request, res: Response) => {
    sLib.printInfo(`POST /tutolytics -> ${req.ip}`);
    const { step } = req.params;

    res.sendStatus(200);

    if (typeof step != 'string') {
        sLib.printError(`Malformed parameter: [${step}]`);
        return;
    }

    sLib.printInfo(`Visitor reached tutorial step: [${parseInt(step)}]`);
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/:uri', async (req: Request, res: Response) => {
    const uri = req.params.uri as string;

    if (!uri.match(/^game-.+/)) {
        sLib.printWarning(`Unexpected: { uri: ${req.params.uri}, ip: ${req.ip} }`);
        res.status(400).send('Unknown address.');

        return;
    }

    sLib.printInfo(`/${uri} -> ${req.ip}`);

    const extraction = extractGameId(uri);

    if (extraction.err) {
        sLib.printWarning(`Issue: [${extraction.message}]`);
        res.status(400).send('Unknown address.');

        return;
    }

    const gameId = extraction.data;

    const validation = await validateClient(req.headers.cookie);

    if (validation.err) {
        sLib.printWarning(validation.message);
        res.redirect('/');

        return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (activeGames.has(gameId)) {
        res.sendFile(path.join(__dirname, 'public', 'game.html'));

        return;
    }

    sLib.printInfo(`[${validation.data.name}] is requesting [${gameId}].`);
    const activation = await activateGame(gameId);

    if (activation.err) {
        sLib.printError(activation.message);
        updateGameStat(gameId, true);

        res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
        return;
    }

    activeGames.set(gameId, activation.data);

    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});
server.listen(PORT_NUMBER, () => {
    console.info('✅ Server started!');
});

// MARK: WS ACTION
async function processAction(
    game: Game,
    request: AuthenticatedClientRequest,
    socket: WebSocket,
) {
    const gameId = game.getGameId();
    const isAdoption = (
        game.getGameState().sharedState.sessionPhase == Phase.enrolment &&
        getActiveUserIdsByGame(gameId).length == 1
    );

    const result = game.processAction(request, isAdoption);

    const save = await dbService.saveGameState(game.getGameState());

    if (save.err) {
        console.error(save.message);
        updateGameStat(gameId, true);
        return broadcastToGroup(gameId, { error: 'Action cannot be saved' });
    }

    updateGameStat(gameId);

    result.senderOnly ? transmit(socket, result.message) : broadcastToGroup(gameId, result.message);
}

// MARK: CALLBACKS
function broadcastCallback(state: State) {
    broadcastToGroup(state.gameId, { state });
}

function transmitCallback(userId: UserId, gameId: GameId, message: ServerMessage) {
    const userConnections = activeUsers.get(userId);

    if (!userConnections)
        return;

    const socket = userConnections.get(gameId)?.socket;
    socket && transmit(socket, message);
}

async function nameUpdateCallback(userId: UserId, name: string) {
    const op = await dbService.updateUserDisplayName(userId, name);

    if (op.err)
        sLib.printError(op.message);
}

// MARK: FUNCTIONS

function logRequest(request: ClientRequest, userName: string, gameId: GameId) {
    const { message } = request;
    const { action, payload } = message;

    console.info(
        '%s | %s -> %s : {%s}',
        gameId,
        userName,
        action || '?',
        payload ? ` ${JSON.stringify(payload)} ` : ' ',
    );
}

function broadcast(message: ServerMessage): void {
    activeUsers.forEach(userConnections => {
        userConnections.forEach(connection => {
            transmit(connection.socket, message);
        });
    });
}

function transmit(socket: WebSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
}

function broadcastToGroup(gameId: GameId, message: ServerMessage): void {
    const playGroupIds = activeGames.get(gameId)?.getAllRefs().map(r => r.id);

    if (!playGroupIds)
        return console.error('Cannot find active GameSession', { gameId });

    for (const userId of playGroupIds) {
        const socket = activeUsers.get(userId)?.get(gameId)?.socket;
        socket && transmit(socket, message);
    }
}

function startGameChecks() {
    const seconds = 1000;
    const minutes = 60 * seconds;
    const hours = 60 * minutes;

    setInterval(async () => {

        // socket heartbeat check
        activeUsers.forEach((userConnections) => {
            userConnections.forEach(connection => {
                const { socket } = connection;

                if (socket.isAlive == false)
                    return socket.terminate();

                socket.isAlive = false;
                socket.ping();
            });
        });

        // stale game check
        const config = await dbService.getConfig();

        if (config.err) {
            sLib.printError(config.message);
            return;
        }

        const { GAME_PERSIST_HOURS: count } = config.data;

        const time = Date.now();

        stats.forEach(async (stat: GameStats, gameId) => {
            const { timeStamp } = stat;

            if (activeGames.has(gameId) && getActiveUserIdsByGame(gameId).length > 0) return;

            activeGames.delete(gameId);
            const elapsedTime = time - timeStamp;
            const persistence = count * hours;

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

async function handleDisconnection(game: Game) {
    const gameId = game.getGameId();

    if (false == activeGames.has(gameId)) return;

    const connectedUsers = getActiveUserIdsByGame(gameId);

    if (connectedUsers.length > 0) return await updateGameStat(gameId);

    const areNoPlayers = game.getAllRefs().every(ref => ref.color == null);
    const operation = areNoPlayers
        ? await dbService.deleteGameState(gameId)
        : await dbService.saveGameState(game.getGameState());

    if (operation.err) {
        sLib.printError(operation.message);

        return await updateGameStat(gameId, true);
    }

    game.deReference();
    activeGames.delete(gameId);

    return await updateGameStat(gameId, areNoPlayers);
}

async function createGame(): Promise<Probable<Game>> {
    const instantiation = await getGameInstance(null);

    if (instantiation.err) {
        sLib.printError(instantiation.message);
        return sLib.fail('Could not create game.');
    }

    const saveOp = await dbService.addGameState(instantiation.data.getGameState());

    if (saveOp.err) {
        sLib.printError(saveOp.message);
        return sLib.fail('Could not persist game state.');
    }

    return instantiation;
}

async function enableSession(
    user: User,
): Promise<Probable<Cookies>> {

    const config = await dbService.getConfig();

    if (config.err)
        return sLib.fail(config.message);

    const lifetime = config.data.USER_SESSION_HOURS * 60 * 60 * 1000;
    const cookies = sLib.produceCookieArgs(false, lifetime);
    const { value: token } = cookies[CookieName.token];

    const expiresAt = Date.now() + lifetime;
    const response = await sessionService.set(token, { ...user, expiresAt });

    return response.ok ? sLib.pass(cookies) : sLib.fail(response.message);
}

async function activateGame(gameId: string): Promise<Probable<Game>> {
    const recovery = await dbService.loadGameState(gameId);

    if (recovery.err) {
        sLib.printError(recovery.message);

        return sLib.fail('Could not recover game');
    }

    const instantiation = await getGameInstance(recovery.data);

    if (instantiation.err) {
        sLib.printError(instantiation.message);

        return sLib.fail('Could not instantiate game.');
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
            fontCache,
        );

        return sLib.pass(session);
    } catch (error) {
        sLib.printError(String(error));

        return sLib.fail('GameSession constructor threw.');
    }
}

function clearSession(cookie: unknown): void {
    const parsing = extractToken(cookie);
    parsing.ok && sessionService.delete(parsing.data);
}
async function validateClient(cookie: unknown): Promise<Probable<UserSession>> {
    const parsing = extractToken(cookie);

    if (parsing.err)
        return sLib.fail(parsing.message);

    const token = parsing.data;
    const sessionOp = await sessionService.get(token);

    if (sessionOp.err)
        return sLib.fail(sessionOp.message);

    const session = sessionOp.data;

    if (session.expiresAt <= Date.now()) {
        sessionService.delete(token);
        return sLib.fail('Session has expired');
    }

    return sLib.pass(session);
}

function extractToken(cookie: unknown): Probable<string> {
    if (typeof cookie != 'string')
        return sLib.fail('No cookie found.');

    const items = sLib.parseCookies(cookie);

    if (!('token' in items))
        return sLib.fail('Cookie might have expired.');

    return sLib.pass(items.token);
}

function extractGameId(parameter: string): Probable<GameId> {
    const [exactMath, _, gameId] = parameter.match(/^(game-)([a-z]+-[a-z]+)$/) || [null, null, null];

    if (!exactMath)
        return sLib.fail(`gameId is malformed!, { gameId: ${parameter} }`);

    return sLib.pass(gameId as GameId);
}

type GameStats = {
    timeStamp: number
    isActiveGame: boolean
    userReferences: Array<UserReference>
    phase: Phase
    players: Array<PlayerEntity>
    activeCount: number
}

async function updateGameStat(gameId: GameId, removeStat: boolean = false): Promise<void> {

    if (removeStat) {
        stats.delete(gameId);
        return;
    }

    const { isActiveGame, gameState } = await (async (): Promise<{ isActiveGame: boolean, gameState: GameState | null }> => {
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
        const connections = getActiveUserIdsByGame(gameId);
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
    const gamesFetch = await dbService.loadAllGames();

    if (gamesFetch.err) {
        sLib.printError(gamesFetch.message);
        console.info('❌ Stats failed.');
        return;
    }

    const allGames = gamesFetch.data;

    for (const gameState of allGames) {
        const { sharedState, userReferences, timeStamp } = gameState;
        const { sessionPhase: phase, players, gameId } = sharedState;

        stats.set(
            gameId,
            { timeStamp, isActiveGame: false, userReferences, phase, players, activeCount: 0 },
        );
    };

    console.info('✅ Stats initialized.');
}
function composeLobbyFeed(userId: UserId): Array<GameFeed> {
    const lobbyFeed = Array.from(stats).map(([gameId, stat]): GameFeed => {
        const { isActiveGame, userReferences, phase, players, activeCount, timeStamp } = stat;
        const userRef = userReferences.find(r => r.id == userId);
        const playerEntity = players.find(p => p.color == userRef?.color);

        const status: GameStatus = (() => {
            switch (phase) {
                case Phase.enrolment:
                    return isActiveGame ? GameStatus.Open : GameStatus.Abandoned;
                case Phase.setup:
                case Phase.play:
                    return GameStatus.Started;
                default:
                    return GameStatus.Ended;
            }
        })();

        const userInvolvement: UserInvolvement = (() => {
            if (!playerEntity)
                return UserInvolvement.None;

            switch (phase) {
                case Phase.play:
                    const player = playerEntity as Player;
                    return player.isCurrent ? UserInvolvement.HasTurn : UserInvolvement.Playing;
                case Phase.setup:
                    const draft = playerEntity as PlayerDraft;
                    return draft.turnToPick ? UserInvolvement.HasTurn : UserInvolvement.Playing;
                default:
                    return UserInvolvement.Playing;
            }
        })();

        const action: LobbyAction | null = (() => {
            switch (true) {
                case Boolean(playerEntity):
                    return LobbyAction.Rejoin;
                case phase == Phase.enrolment:
                    return isActiveGame ? LobbyAction.Join : LobbyAction.Adopt;
                default:
                    return LobbyAction.Observe;
            }
        })();

        const activity = { enrolled: players.length, active: activeCount };

        return { timeStamp, gameId, action, activity, status, userInvolvement };
    });

    return lobbyFeed;
}

function getActiveUserIdsByGame(gameId: GameId): Array<UserId> {
    return Array.from(activeUsers.entries())
        .filter(([, activeUser]) => activeUser.has(gameId))
        .map(([userId]) => userId);
}

// MARK: DEBUG
const debugApp = express();
debugApp.get('/debug', (req: Request, res: Response) => {
    const command = typeof req.query.command == 'string' ? req.query.command : undefined;
    const target = typeof req.query.target == 'string' ? req.query.target : undefined;
    const option = typeof req.query.option == 'string' ? req.query.option : undefined;

    res.json(debugCommand(command, target, option));
});
debugApp.listen(3013, '127.0.0.1'); // Localhost only
function debugCommand(command?: string, target?: string, option?: string): object {
    console.log('debug command', { command, target });

    if (!command)
        return {
            overview: {
                active_games: activeGames.size,
                connected_users: activeUsers.size,
                game_stats: stats.size,
            },
            commands: ['users', 'stats', 'games'],
        };

    switch (command) {
        case 'users':
            return Array.from(activeUsers.keys());
        case 'games':
            return debugGame(target, option);
        case 'stats':
            return debugStat(target, option);
        default:
            return { command: `${command} ¯\_(ツ)_/¯` };
    }

    function debugGame(gameId?: string, option?: string) {
        const probableGameId = gameId as GameId | undefined;

        if (!probableGameId || !activeGames.has(probableGameId))
            return Array.from(activeGames.keys());

        const game = activeGames.get(probableGameId) as Game;

        if (!option) {
            return {
                overview: {
                    refs: game.getAllRefs().length,
                    connected: getActiveUserIdsByGame(probableGameId).length,
                },
                options: ['refs', 'connected'],
            };
        }

        switch (option) {
            case 'refs':
                return game.getAllRefs().map(r => r.name);
            case 'connected':
                return getActiveUserIdsByGame(probableGameId).map(userId =>
                    game.getAllRefs().filter(r => r.id == userId)[0].name,
                );
            default:
                return { option: `${option} ¯\_(ツ)_/¯` };
        }
    }

    function debugStat(gameId?: string, option?: string) {
        const probableGameId = gameId as GameId | undefined;

        if (!probableGameId || !stats.has(probableGameId))
            return Array.from(stats.keys());

        const options = ['refs', 'players'];
        const stat = stats.get(probableGameId) as GameStats;

        if (!option)
            return {
                overview: {
                    timeStamp: stat.timeStamp,
                    isActiveGame: stat.isActiveGame,
                    userReferences_length: stat.userReferences.length,
                    phase: stat.phase,
                    players_length: stat.players.length,
                    activeCount: stat.activeCount,
                },
                options,
            };

        switch (option) {
            case 'refs':
                return stat.userReferences;
            case 'players':
                return stat.players.map(p => reduceToEntry(p));
            default:
                return options;
        }

        function reduceToEntry(player: PlayerEntity): PlayerEntry {
            const { color, name, isAway } = player;
            return { color, name, isAway };
        }

    }
}


