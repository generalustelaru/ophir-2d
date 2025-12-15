import {
    AuthenticatedClientRequest, AuthenticationForm, Configuration, CookieName, Probable, RegistrationForm, SessionState,
} from '~/server_types';
import { validator } from './services/validation/ValidatorService';
import { ServerMessage, PlayState, Action } from '~/shared_types';
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

app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
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

app.use(express.urlencoded({ extended: true }));

app.post('/register', (req: Request, res: Response) => {
    const form = req.body as RegistrationForm;

    dbService.registerUser(form).then(registration => {

        if (registration.err) {
            res.status(400).send(registration.message);
        } else {
            const cookies = sLib.produceCookieArgs(false, form.email);
            const tokenCookie = cookies[CookieName.authToken];
            dbService.setAuthToken(form.email, tokenCookie.value).then(patch => {

                if (patch.err) {
                    res.status(500).send(patch.message);
                } else {
                    console.info('New registration',{ email: form.email });
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

app.post('/login', (req: Request, res: Response) => {
    const form = req.body as AuthenticationForm;

    dbService.authenticateUser(form).then(result => {

        if (result.err) {
            res.status(400).send(result.message);
        } else {
            const cookies = sLib.produceCookieArgs(false, form.email);
            const tokenCookie = cookies[CookieName.authToken];
            dbService.setAuthToken(form.email, tokenCookie.value).then(patch => {

                if (patch.err) {
                    console.error(patch.message);
                    res.status(500).send(patch.message);
                } else {
                    console.info('User logged in',{ email: form.email });
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

    validateClient(req.headers.cookie).then(validation => {

        if (validation.ok) {
            createGameSession().then(session => {

                if (session) {
                    const gameId = session.getGameId();
                    playGroups.set(gameId, { session, sockets: new Map(), socketIds: new Map() });

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

    validateClient(req.headers.cookie).then(validation => {

        if (validation.ok) {
            res.setHeader('X-Content-Type-Options', 'nosniff');

            if (playGroups.has(gameId)) {
                res.sendFile(path.join(__dirname,'public', 'game.html'));
            } else {
                reviveGameSession(gameId).then(session => {

                    if (session) {
                        playGroups.set(gameId, { session, sockets: new Map(), socketIds: new Map() });
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
type SocketId = string
type GameId = string
type Email = string
type PlayGroup = {
    session: GameSession
    sockets: Map<SocketId, WebSocket>
    socketIds: Map<Email, SocketId>
}
type SocketReference = {
    socket: WebSocket
    gameId: GameId
}

const socketServer = new WebSocketServer({ port: WS_PORT });
const socketRefs: Map<SocketId, SocketReference> = new Map();
const playGroups: Map<GameId, PlayGroup> = new Map();

socketServer.on('connection', function connection(socket, inc) {
    const params = inc.url ? new URL(inc.url, `http://${inc.headers.host}`).searchParams : null;
    const gameId = params?.get('gameId');

    if (!gameId){
        console.error('WS connection did not provide gameId.');
        transmit(socket, { error: 'Invalid connection data.' });
        return socket.close();
    }

    const playGroup = playGroups.get(gameId);
    let userEmail: string;
    let socketId: string;

    if (!playGroup) {
        console.warn('WS requested inexistent play session.');
        transmit(socket, { notFound: null });
        return socket.close();
    }

    validateClient(inc.headers.cookie).then(validation => {

        if (validation.err) {
            console.error('WS connection has invalid cookie.', { err: validation.message });
            transmit(socket, { error: 'Invalid connection data.' });
            return socket.close();
        }

        userEmail = validation.data.userEmail;

        socketId = (() => {
            const oldId = playGroup.socketIds.get(userEmail);

            if (oldId)
                return oldId;

            const newId = randomUUID();

            playGroup.socketIds.set(userEmail, newId);
            playGroup.session.setPlayerRef(userEmail, newId);

            return newId;
        })();

        socketRefs.set(socketId, { gameId, socket });
        playGroup.sockets.set(socketId, socket);
        console.log('websocket added to play group');

        transmit(socket, { state: playGroup.session.getSharedState() });
    });

    socket.on('message', function incoming(req: string) {
        const clientRequest = validator.validateClientRequest(JSON.parse(req));

        if (!clientRequest)
            return transmit(socket, { error: 'Invalid request data.' });

        // logRequest(clientRequest);

        playGroup.socketIds.get(userEmail);

        if (clientRequest.message.action == Action.declare_reset) {
            dbService.getConfig().then(configuration => {
                if (configuration.err)
                    return console.error(configuration.message);

                playGroup.session.updateConfig(configuration.data);
                processAction(playGroup.session, { ...clientRequest, socketId }, socket);
            });
        } else {
            processAction(playGroup.session, { ...clientRequest, socketId }, socket);
        }
    });
});

async function processAction(
    session: GameSession,
    request: AuthenticatedClientRequest,
    socket: WebSocket,
) {
    const result = session.processAction(request);

    if (request.message.action == Action.end_turn) {
        const save = await dbService.saveGameState(session.getSessionState());

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

// function logRequest(request: ClientRequest) {
//     const { playerColor, playerName, message } = request;
//     const { action, payload } = message;

//     const name = playerName || playerColor || '';
//     const colorized = {
//         Purple: `\x1b[95m${name}\x1b[0m`,
//         Yellow: `\x1b[93m${name}\x1b[0m`,
//         Red: `\x1b[91m${name}\x1b[0m`,
//         Green: `\x1b[92m${name}\x1b[0m`,
//     };
//     const clientName = playerColor ? colorized[playerColor] : 'anon';

//     console.info(
//         '%s -> %s%s',
//         clientName,
//         action ?? '?',
//         payload ? `: ${JSON.stringify(payload)}` : ': { }',
//     );
// }

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
                    const save = await dbService.saveGameState(playGroup.session.getSessionState());

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

    const result = await dbService.addGameState(gameSession.getSessionState());

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

async function validateClient(cookie: unknown): Promise<Probable<{authToken: string, userEmail: string}>> {
    console.info('Validating client');

    if (typeof cookie != 'string')
        return sLib.fail('Cannot parse cookie, not a string');

    const clientData = sLib.parseCookies(cookie);

    if (!('authToken' in clientData) || !('userEmail' in clientData))
        return sLib.fail('Cookie is missing essential data.');

    const { authToken, userEmail } = clientData;
    const result = await dbService.getUser(userEmail);

    if (result.err)
        return sLib.fail(result.message);

    const user = result.data;

    if (user.authToken != authToken)
        return sLib.fail('Unauthorized request');

    return sLib.pass({ authToken, userEmail });
}

