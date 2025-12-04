import process from 'process';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { ServerMessage, ClientRequest, PlayState, Phase, State } from '~/shared_types';
import { SessionState } from '~/server_types';
import { GameSession } from './GameSession';
import { randomUUID } from 'crypto';
import { validator } from './services/validation/ValidatorService';
import tools from './services/ToolService';
import dbService from './services/DatabaseService';
import readline from 'readline';
import path from 'path';

import { SERVER_ADDRESS, HTTP_PORT, WS_PORT, DB_PORT } from './configuration';

if (!SERVER_ADDRESS || !HTTP_PORT || !WS_PORT || !DB_PORT) {
    console.error('Missing environment variables', {
        SERVER_ADDRESS, HTTP_PORT, WS_PORT, DB_PORT,
    });
    process.exit(1);
}

dbService.getConfig().then(configuration => {
    if (!configuration){
        console.error('Missing Configuration object.');
        process.exit(1);
    }

    console.log(configuration);
});


// MARK: PROCESS
process.on('SIGINT', () => {
    broadcast({ error: 'The server encountered an issue and is shutting down :(' });
    socketServer.close();
    console.log('Exiting...');
    process.exit(0);
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
    if (req.query.auth != process.env.ADMIN_AUTH) {
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
    console.info('Unchecked visitor', { ip: req.ip });

    res.sendFile(path.join(__dirname,'public', 'session-check.html'));
});

app.get('/find', (req: Request, res: Response) => {
    const gameId = req.query.gameId;
    console.info('Visitor returns possible gameId', { ip: req.ip, gameId });

    if (typeof gameId == 'string' && activeSessions.has(gameId)) {
        res.status(200);

    } else if (typeof gameId == 'string') {
        dbService.loadGameState(gameId).then(state => {
            if (!state) {
                res.status(404);

            } else {
                const session = new GameSession(
                    broadcastCallback,
                    transmitCallback,
                    state,
                );
                activeSessions.set(gameId, { session, sockets: new Map() });
                res.status(200);
            }
        });
    } else {
        res.status(400);
    }

    res.send();
});


app.get('/new', (req: Request, res: Response) => {
    console.info('Visitor calls for new session', { ip: req.ip });
    const session = activateSession(null);

    res.redirect(`/${session.getGameId()}`);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/:id', (req: Request, res: Response) => {
    console.info(`Visitor seeks session ${req.params.id}`, { ip: req.ip });

    res.sendFile(path.join(__dirname,'public', 'index.html'));
});

// MARK: WS

type SessionGroup = {
    session: GameSession,
    sockets: Map<string, WebSocket>,
}
const socketServer = new WebSocketServer({ port: WS_PORT });
const broadcastGroup: Map<string, WebSocket> = new Map();
const activeSessions: Map<string, SessionGroup> = new Map();

setInterval(() => {
    activeSessions.forEach((group) => {

        group.sockets.forEach((socket, socketId) => {

            if (socket.readyState === WebSocket.CLOSED) {
                group.sockets.delete(socketId);
                console.log('Removing abandoned client:', socketId);
            }
        });
    });
}, 60000); // Every minute

socketServer.on('connection', function connection(socket,req) {
    const socketId = randomUUID();
    const params = req.url ? new URL(req.url, `http://${req.headers.host}`).searchParams : null;
    const gameId = params?.get('gameId');

    if (!gameId){
        console.error('WS connection did not provide gameId.');
        return transmit(socket, { error: 'Invalid connection data.' });
    }

    function notifyIfActive(state: State) {
        if (state.sessionPhase == Phase.play) {
            const activePlayer = state.players.find(p => p.isActive);
            activePlayer?.socketId == socketId && transmit(socket, { turnStart: null });
        }
    }

    const group = activeSessions.get(gameId);

    if (group) {
        group.sockets.set(socketId, socket);
        notifyIfActive(group.session.getCurrentState().sharedState);

    } else {
        dbService.loadGameState(gameId).then(state => {
            if (!state) {
                console.error('Could not find stored session', { gameId });
                return transmit(socket, { notFound: null });
            }

            const group = {
                sockets: new Map().set(socketId, socket),
                session: new GameSession(broadcastCallback, transmitCallback, state),
            };
            notifyIfActive(state.sharedState);

            activeSessions.set(gameId, group);
        });
    }

    broadcastGroup.set(socketId, socket);
    socket.send(JSON.stringify({ socketId }));

    socket.on('message', function incoming(req: string) {
        const clientRequest = validator.validateClientRequest(tools.parse(req));

        if (!clientRequest)
            return transmit(socket, { error: 'Invalid request data.' });

        logRequest(clientRequest);
        const gameId = clientRequest.gameId;
        let session = activeSessions.get(gameId)?.session;

        if (session)
            return processResponse(session, clientRequest, socket);

        dbService.loadGameState(gameId).then(state => {
            if (!state) {
                console.error('Could not find stored session', { gameId });
                return transmit(socket, { notFound: null });
            }

            const session = new GameSession(broadcastCallback, transmitCallback, state);
            activeSessions.set(
                gameId,
                { session, sockets: new Map().set(socketId, socket) },
            );

            processResponse(session, clientRequest, socket);
        });
    });

    socket.on('close', () => {
        broadcastGroup.delete(socketId);
        // TODO: check the socket group for abandonment; dereference session and remove the object if true. 
        group?.sockets.delete(socketId);
    });
});

function activateSession(savedSession: SessionState | null): GameSession {
    const gameSession = new GameSession(broadcastCallback, transmitCallback, savedSession);
    const gameId = gameSession.getGameId();

    if (!savedSession)
        dbService.addGameState(gameSession.getCurrentState());

    activeSessions.set(gameId, { session: gameSession, sockets: new Map() });

    return gameSession;
}

function processResponse(session: GameSession, request: ClientRequest, socket: WebSocket) {
    const response = session.processAction(request);

    if (!response)
        return transmit(socket, { error: 'Session has become corrupt.' });

    dbService.saveGameState(session.getCurrentState());

    response.senderOnly
        ? transmit(socket, response.message)
        : broadcastToGroup(session.getGameId(), response.message);
}

// MARK: CALLBACKS
function broadcastCallback(state: PlayState) {
    broadcastToGroup(state.gameId, { state });
}

function transmitCallback(socketId: string, message: ServerMessage) {
    const socket = broadcastGroup.get(socketId);

    if (!socket)
        return console.error('Cannot deliver message: Missing socket client.', { message });

    transmit(socket, message);
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
    broadcast({ error: 'The server is entering maintenance.' });
    console.log('Shutting down...');
    rl.close();

    broadcastGroup.forEach(socket => socket.close(1000));

    setTimeout(() => {
        socketServer.close();
        console.log('Server off.');
        process.exit(0);
    }, 3000);
}

function broadcast(message: ServerMessage): void {
    broadcastGroup.forEach(socket => {
        transmit(socket, message);
    });
}

function transmit(socket: WebSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
}

function broadcastToGroup(gameId: string, message: ServerMessage): void {
    const groupSockets = activeSessions.get(gameId)?.sockets;

    if (!groupSockets)
        return console.error('Cannot find active GameSession', { gameId });

    groupSockets.forEach(socket => {
        transmit(socket, message);
    });
}
