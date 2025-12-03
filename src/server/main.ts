import process from 'process';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { ServerMessage, ClientRequest, PlayState } from '~/shared_types';
import { SessionState } from '~/server_types';
import tools from './services/ToolService';
import { GameSession } from './GameSession';
import { validator } from './services/validation/ValidatorService';
import { randomUUID } from 'crypto';
import readline from 'readline';
import path from 'path';

import { SERVER_ADDRESS, HTTP_PORT, WS_PORT, DB_PORT } from './configuration';

if (!SERVER_ADDRESS || !HTTP_PORT || !WS_PORT || !DB_PORT) {
    console.error('Missing environment variables', {
        SERVER_ADDRESS, HTTP_PORT, WS_PORT, DB_PORT,
    });
    process.exit(1);
}

const dbAddress = `http://localhost:${DB_PORT}`;

fetch(`${dbAddress}/config`).then(response => {
    if (!response.ok)
        throw new Error(response.statusText);
}).catch(error => {
    console.error('Error connecting to DB',{ error });
    process.exit(1);
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
// TODO: have an extra HTML file sent to gather localStorage data and call the possible existing session
app.get('/', (req: Request, res: Response) => {
    console.info('New visitor', { ip: req.ip });
    const session = activateSession(null);

    res.redirect(`/${session.getGameId()}`);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/:id', (req: Request, res: Response) => {
    console.info(`Visitor for session ${req.params.id}`, { ip: req.ip });

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

    const group = activeSessions.get(gameId);

    if (group) {
        group.sockets.set(socketId, socket);

    } else {
        loadGameState(gameId).then(state => {
            if (!state) {
                console.error('Could not find active session', { gameId });
                return transmit(socket, { error: 'Invalid connection data.' });
            }

            const group = {
                sockets: new Map().set(socketId, socket),
                session: new GameSession(broadcastCallback, transmitCallback, state),
            };

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
        const session = activeSessions.get(gameId)?.session;

        if (!session) {
            console.error('Connected client requested non-active session', { id: gameId });

            return transmit(socket, { error: `Game ${gameId} cannot be served.` });
        }

        processResponse(session, clientRequest, socket);
    });

    socket.on('close', () => {
        broadcastGroup.delete(socketId);
        group?.sockets.delete(socketId);
    });
});

function activateSession(savedSession: SessionState | null): GameSession {
    const gameSession = new GameSession(broadcastCallback, transmitCallback, savedSession);
    const gameId = gameSession.getGameId();

    if (!savedSession)
        addGameState(gameSession.getCurrentState());

    activeSessions.set(gameId, { session: gameSession, sockets: new Map() });

    return gameSession;
}

function processResponse(session: GameSession, request: ClientRequest, socket: WebSocket) {
    const response = session.processAction(request);

    if (!response)
        return transmit(socket, { error: 'Session has become corrupt.' });

    const gameState = session.getCurrentState();
    saveGameState(gameState);

    if (response.senderOnly)
        return transmit(socket, response.message);

    return broadcastToGroup(gameState.sharedState.gameId, response.message);
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

// MARK: DATABASE

async function addGameState(savedSession: SessionState) {
    const id = savedSession.sharedState.gameId;

    const response = await fetch(
        `${dbAddress}/sessions`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, data: savedSession }),
        },
    );

    if (!response.ok)
        console.error('Failed to add game state:', { error: response.status });
}

async function saveGameState(savedSession: SessionState) {

    const id = savedSession.sharedState.gameId;

    const response = await fetch(
        `${dbAddress}/sessions/${id}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, data: savedSession }),
        },
    );

    if (!response.ok)
        console.error('Failed to save game state:', { error: response.status });
}

async function loadGameState(gameId: string): Promise<SessionState | null> {
    try {
        const response = await fetch(`${dbAddress}/sessions/${gameId}`);

        if (!response.ok)
            throw new Error(`DB Error: ${response.status}`);

        const entry = await response.json();

        if (typeof entry != 'object' || !entry.data)
            throw new Error(`Data Error: ${entry}`);

        if (!('data' in entry))
            throw new Error('Db entry is corrupted.');

        const gameState = validator.validateStateFile(entry.data);

        if (!gameState)
            throw new Error('Stored game state is corrupted.');

        return gameState;

    } catch (error) {
        console.log('Could not resolve data', { error });

        return null;
    }
}
