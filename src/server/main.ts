import { AuthenticationForm, Configuration, CookieName, RegistrationForm, SessionState } from '~/server_types';
import { ServerMessage, ClientRequest, PlayState, Action } from '~/shared_types';
import { validator } from './services/validation/ValidatorService';
import express, { Request, Response } from 'express';
import dbService from './services/DatabaseService';
import { WebSocketServer, WebSocket } from 'ws';
import { GameSession } from './GameSession';
import { randomUUID } from 'crypto';
import sLib from './server_lib';
import readline from 'readline';
import process from 'process';
import path from 'path';

import { SERVER_ADDRESS, HTTP_PORT, WS_PORT, DB_PORT } from '../environment';

if (!SERVER_ADDRESS || !HTTP_PORT || !WS_PORT || !DB_PORT) {
    console.error('Missing environment variables', {
        SERVER_ADDRESS, HTTP_PORT, WS_PORT, DB_PORT,
    });
    process.exit(1);
}

var auth: string;
dbService.getConfig().then(configuration => {
    if (configuration.err){
        console.error(configuration.message);
        process.exit(1);
    }

    auth = configuration.data.ADMIN_AUTH;

    startSessionChecks(configuration.data);
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

            switch (input) {
                case 'shutdown':
                    shutDown();
                    return;

                default:
                    console.error('\n\x1b[91m ¯\\_(ツ)_/¯ \x1b[0m', input);
                    break;
            }

            promptForInput();
        });
    }
)();

// MARK: HTTP
const app = express();

app.listen(HTTP_PORT, () => {
    console.info(`Listening on http://${SERVER_ADDRESS}:${HTTP_PORT}`);
});

app.get('/shutdown', (req: Request, res: Response) => {
    if (req.query.auth != auth) {
        console.warn('Unauthorized shutdown attempt');
        res.status(401).send('Unauthorized');

        return;
    }

    console.warn('Remote server shutdown!');
    res.status(200).send('SHUTDOWN OK');
    shutDown();
});

app.get('/probe', (req: Request, res: Response) => {
    console.info('Server probed', { ip: req.ip });
    res.status(200).send('SERVER OK');
});

app.get('/', (req: Request, res: Response) => {
    console.info('Unknown visitor', { ip: req.ip });

    res.sendFile(path.join(__dirname,'public', 'index.html'));
});

app.get('/register', (req: Request, res: Response) => {
    const query = req.query as RegistrationForm;

    dbService.registerUser(query).then(registration => {

        if (registration.err) {
            res.status(400).send(registration.message);
        } else {
            const cookies = sLib.produceCookieArgs(false, query.email);
            const tokenCookie = cookies[CookieName.authToken];
            dbService.setSessionToken(query.email, tokenCookie.value).then(patch => {

                if (patch.err) {
                    res.status(500).send(patch.message);
                } else {
                    console.info('New registration',{ email: query.email });
                    for (const cookieName in cookies) {
                        const { value, options } = cookies[cookieName as CookieName];
                        res.cookie(cookieName, value, options);
                    }
                    res.redirect('/new');
                }
            });
        }
    });
});

app.get('/login', (req: Request, res: Response) => {
    const query = req.query as AuthenticationForm;

    dbService.authenticateUser(query).then(result => {

        if (result.err) {
            res.status(400).send(result.message);
        } else {
            const cookies = sLib.produceCookieArgs(false, query.email);
            const tokenCookie = cookies[CookieName.authToken];
            dbService.setSessionToken(query.email, tokenCookie.value).then(patch => {

                if (patch.err) {
                    res.status(500).send(patch.message);
                } else {
                    console.info('User logged in',{ email: query.email });
                    for (const cookieName in cookies) {
                        const { value, options } = cookies[cookieName as CookieName];
                        res.cookie(cookieName, value, options);
                    }
                    res.redirect('/new');
                }
            });
        }
    });
});

app.get('/new', (req: Request, res: Response) => {
    console.info('Visitor calls for new session', { ip: req.ip });

    verifyAuthenticity(req).then(isAuthenticated => {

        if (isAuthenticated) {
            createGameSession().then(session => {

                if (session) {
                    const gameId = session.getGameId();
                    const group = { session, sockets: new Map() };
                    playGroups.set(gameId, group);

                    res.redirect(`/${gameId}`);
                } else {
                    res.status(500).send('Server has encountered a problem :(');
                }
            });
        } else {
            res.redirect('/');
        }
    });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/:id', (req: Request, res: Response) => {
    const gameId = req.params.id;
    console.info('Visitor requests session', { ip: req.ip, gameId });

    verifyAuthenticity(req).then(isAuthenticated => {

        if (isAuthenticated) {

            if (playGroups.has(gameId)) {
                res.sendFile(path.join(__dirname,'public', 'game.html'));
            } else {
                reviveGameSession(gameId).then(session => {

                    if (session) {
                        playGroups.set(gameId, { session, sockets: new Map() });
                        res.sendFile(path.join(__dirname,'public', 'game.html'));
                    } else {
                        res.redirect('/new');
                    }
                });
            }
        } else {
            res.redirect('/');
        }
    });
});

// MARK: WS
type PlayGroup = {
    session: GameSession,
    sockets: Map<string, WebSocket>,
}
type SocketReference = {
    socket: WebSocket,
    gameId: string,
    authToken: string,
}

const socketServer = new WebSocketServer({ port: WS_PORT });
const socketRefs: Map<string, SocketReference> = new Map();
const playGroups: Map<string, PlayGroup> = new Map();

socketServer.on('connection', function connection(socket, req) {
    const params = req.url ? new URL(req.url, `http://${req.headers.host}`).searchParams : null;
    const gameId = params?.get('gameId');

    if (!gameId){
        console.error('WS connection did not provide gameId.');
        return transmit(socket, { error: 'Invalid connection data.' });
    }

    const playGroup = playGroups.get(gameId);

    if (!playGroup)
        return transmit(socket, { notFound: null });

    const socketId = randomUUID();
    const { authToken } = sLib.parseCookies(req.headers.cookie);
    socketRefs.set(socketId, { gameId, socket, authToken });
    playGroup.sockets.set(socketId, socket);
    console.log('websocket added to play group');

    socket.send(JSON.stringify({ socketId }));

    socket.on('message', function incoming(req: string) {
        const clientRequest = validator.validateClientRequest(JSON.parse(req));

        if (!clientRequest)
            return transmit(socket, { error: 'Invalid request data.' });

        logRequest(clientRequest);

        const gameId = clientRequest.gameId;
        const session = playGroups.get(gameId)?.session;

        if (!session)
            return transmit(socket, { notFound: null });

        if (clientRequest.message.action == Action.declare_reset) {
            dbService.getConfig().then(configuration => {
                if (configuration.err)
                    return console.error(configuration.message);

                session.updateConfig(configuration.data);
                processAction(session, clientRequest, socket);
            });
        } else {
            processAction(session, clientRequest, socket);
        }
    });
});

async function processAction(session: GameSession, request: ClientRequest, socket: WebSocket) {
    const result = session.processAction(request);

    if (request.message.action == Action.end_turn) {
        const save = await dbService.saveGameState(session.getCurrentState());

        if (save.err) {
            console.error(save.message);
            return broadcastToGroup(session.getGameId(), { error: 'Action cannot be saved' });
        }
    }

    result.senderOnly
        ? transmit(socket, result.message)
        : broadcastToGroup(session.getGameId(), result.message)
    ;
}

// MARK: CALLBACKS
function broadcastCallback(state: PlayState) {
    broadcastToGroup(state.gameId, { state });
}

function transmitCallback(socketId: string, message: ServerMessage) {
    const reference = socketRefs.get(socketId);

    if (!reference)
        return console.error('Cannot deliver message: Missing socket client.', { message });

    transmit(reference.socket, message);
}

// MARK: FUNCTIONS

function logRequest(request: ClientRequest) {
    const { playerColor, playerName, message } = request;
    const { action, payload } = message;

    const name = playerName || playerColor || '';
    const colorized = {
        Purple: `\x1b[95m${name}\x1b[0m`,
        Yellow: `\x1b[93m${name}\x1b[0m`,
        Red: `\x1b[91m${name}\x1b[0m`,
        Green: `\x1b[92m${name}\x1b[0m`,
    };
    const clientName = playerColor ? colorized[playerColor] : 'anon';

    console.info(
        '%s -> %s%s',
        clientName,
        action ?? '?',
        payload ? `: ${JSON.stringify(payload)}` : ': { }',
    );
}

function shutDown() {
    rl.close();
    console.log('Shutting down...');

    broadcast({ error: 'The server is entering maintenance.' });
    socketRefs.forEach(ref => ref.socket.close(1000));

    setTimeout(() => {
        socketServer.close();
        console.log('Server off.');
        process.exit(0);
    }, 3000);
}

function broadcast(message: ServerMessage): void {
    socketRefs.forEach(ref => {
        transmit(ref.socket, message);
    });
}

function transmit(socket: WebSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
}

function broadcastToGroup(gameId: string, message: ServerMessage): void {
    const groupSockets = playGroups.get(gameId)?.sockets;

    if (!groupSockets)
        return console.error('Cannot find active GameSession', { gameId });

    groupSockets.forEach(socket => {
        transmit(socket, message);
    });
}

function startSessionChecks(configuration: Configuration) {
    const { SESSION_DELETION_HOURS } = configuration;
    console.info('Starting session checks');

    const minutes = 60000;
    setInterval(() => {
        // free memory
        socketRefs.forEach(async (reference, socketId) => {
            const { gameId, socket } = reference;
            if (
                socket.readyState == socket.CLOSED
            ) {
                socketRefs.delete(socketId);
                const playGroup = playGroups.get(gameId);
                playGroup && playGroup.sockets.delete(socketId);

                if (playGroup?.sockets.size == 0) {
                    const save = await dbService.saveGameState(playGroup.session.getCurrentState());

                    if (save.ok) {
                        playGroup.session.deReference();
                        playGroups.delete(gameId);
                        console.info('deactivated empty session', { gameId });
                    } else {
                        console.error('Failed to preserve game state. Session remains active.');
                    }
                }
            }
        });
    }, 5 * minutes);

    const hours = 3600000;
    setInterval(() => {
        // free storage
        dbService.getTimestamps().then(timeStamps => {
            if (timeStamps.err)
                return console.error('Corrupt session record found in routine check.');

            const time = Date.now();

            for (const item of timeStamps.data) {
                if (time - item.timeStamp > (SESSION_DELETION_HOURS * hours) && !playGroups.has(item.id)) {
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

async function createGameSession(): Promise<GameSession | null> {
    const gameSession = await getGameSessionInstance(null);

    if (!gameSession)
        return null;

    const result = await dbService.addGameState(gameSession.getCurrentState());

    if (result.err) {
        console.error(result.message);
        return null;
    }

    return gameSession;
}

async function reviveGameSession(gameId: string): Promise<GameSession|null> {
    const result = await dbService.loadGameState(gameId);

    if (result.ok)
        return await getGameSessionInstance(result.data);

    console.error(result.message);
    return null;
}

async function getGameSessionInstance(savedSession: SessionState | null): Promise<GameSession|null> {
    const result = await dbService.getConfig();

    if (result.err) {
        console.error(result.message);
        return null;
    }

    try {
        const configuration = result.data;

        return new GameSession(broadcastCallback, transmitCallback, configuration, savedSession);
    } catch (error) {
        console.error(error);

        return null;
    }
}

async function verifyAuthenticity(request: Request): Promise<boolean> {
    const { authToken, userEmail } = sLib.parseCookies(request.headers.cookie);
    const result = await dbService.getUser(userEmail);

    if (result.err) {
        console.error(result.message);
        return false;
    }

    const user = result.data;

    if (user.sessionToken != authToken) {
        console.error('Unauthorized request', { headers: request.headers });
        return false;
    }

    return true;
}

