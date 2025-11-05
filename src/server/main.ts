import process from 'process';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { ClientIdResponse, ServerMessage, ResetResponse, ClientRequest, PlayState, PlayerEntity } from '~/shared_types';
import { WsClient, SavedSession } from '~/server_types';
import tools from './services/ToolService';
import { GameSession } from './GameSession';
import { validator } from './services/validation/ValidatorService';
import { randomUUID } from 'crypto';
import readline from 'readline';
const fs = require('fs').promises;
const path = require('path');
const STATE_FILE = 'game-state.json';

import { SERVER_ADDRESS, HTTP_PORT, WS_PORT, SERVER_NAME, PERSIST_SESSION } from './configuration';

if (!SERVER_ADDRESS || !HTTP_PORT || !WS_PORT) {
    console.error('Missing environment variables');
    process.exit(1);
}

// MARK: PROCESS
process.on('SIGINT', () => {
    broadcast({ error: 'The server encountered an issue and is shutting down :(' });
    socketServer.close();
    console.log('Exiting...');
    process.exit(0);
});

// MARK: HTTP
const app = express();
app.use(express.static('public'));
app.use(express.static(__dirname));

app.get('/', (req: Request, res: Response) => {
    console.info('GET / from', req.ip);
    res.sendFile(__dirname + 'public/index.html');
});

app.get('/shutdown', (req: Request, res: Response) => {
    if (req.query.auth !== process.env.ADMIN_AUTH) {
        console.error('Unauthorized shutdown attempt');
        res.status(401).send('Unauthorized');

        return;
    }

    console.warn('Remote server shutdown!');
    res.status(200).send('SHUTDOWN OK');
    shutDown();
});

app.get('/reset', (req: Request, res: Response) => {
    if (req.query.auth !== process.env.ADMIN_AUTH) {
        console.error('Unauthorized shutdown attempt');
        res.status(401).send('Unauthorized');

        return;
    }

    console.warn('Remote server shutdown!');
    res.status(200).send(' OK');
    reset();
});

app.get('/probe', (req: Request, res: Response) => {
    console.info('Server probed', { ip: req.ip });
    res.status(200).send('SERVER OK');
});

app.listen(HTTP_PORT, () => {
    console.info(`Server running at http://${SERVER_ADDRESS}:${HTTP_PORT}`);
});

// MARK: CLI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

(
    function promptForInput(): void {
        rl.question('\n', (input) => {

            switch (input) {
                case 'shutdown':
                    shutDown();
                    return;

                case 'reset':
                    reset();
                    break;

                default:
                    console.error('\n\x1b[91m ¯\\_(ツ)_/¯ \x1b[0m', input);
                    break;
            }

            promptForInput();
        });
    }
)();

// MARK: WS
const socketClients: Map<string, WsClient> = new Map();
const socketServer = new WebSocketServer({ port: WS_PORT });

let singleSession: GameSession | null;

loadGameState().then(data => {
    const savedState = PERSIST_SESSION && data
        ? validator.validateStateFile(data)
        : null;

    singleSession = new GameSession(
        broadcastCallback,
        transmitCallback,
        savedState,
    );
});

socketServer.on('connection', function connection(socket) {
    const socketId = randomUUID();
    socketClients.set(socketId, { socketId, gameId: null, socket });

    const response: ClientIdResponse = { socketId };
    socket.send(JSON.stringify(response));

    socket.on('message', function incoming(req: string) {
        if (!singleSession)
            return transmit(socket, { error: 'Session is unavailable.' });

        const clientRequest = validator.validateClientRequest(tools.parse(req));

        if (!clientRequest)
            return transmit(socket, { error: 'Invalid request data.' });

        logRequest(clientRequest);
        const response = singleSession.processAction(clientRequest);

        if (!response)
            return transmit(socket, { error: 'Session has become corrupt.' });

        if (PERSIST_SESSION)
            saveGameState(singleSession.getCurrentSession());

        if (response.senderOnly)
            return transmit(socket, response.message);

        return broadcast(response.message);
    });

    socket.on('close', () => {
        const deadClient = (
            singleSession?.getCurrentSession().sharedState.players.find((p: PlayerEntity) => p.socketId === socketId)
        );

        deadClient && console.log('Removing disconnected client of', deadClient.name);

        socketClients.delete(socketId);
    });
});

// MARK: CALLBACKS

function broadcastCallback(state: PlayState) {
    broadcast({ state });
}

function transmitCallback(socketId: string, message: ServerMessage) {
    const client = socketClients.get(socketId);

    if (!client)
        return console.error('Cannot deliver message: Missing socket client.');

    transmit(client.socket, message);
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
    socketClients.forEach(client => client.socket.close(1000));
    setTimeout(() => {
        socketServer.close();
        console.log('Server off.');
        process.exit(0);
    }, 3000);
}

function reset() {
    if (!singleSession)
        return broadcast({ error: 'Session has become corrupt.' });

    console.log('Session is resetting!');
    singleSession.resetSession();
    saveGameState(singleSession.getCurrentSession());
    const resetMessage: ResetResponse = { resetFrom: SERVER_NAME };

    broadcast(resetMessage);
}

function broadcast(message: ServerMessage): void {
    socketClients.forEach(client => {
        client.socket.send(JSON.stringify(message));
    });
}

function transmit(socket: WebSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
}

setInterval(() => {
    socketClients.forEach((client, socketId) => {
        if (client.socket.readyState === WebSocket.CLOSED) {
            socketClients.delete(socketId);
            console.log('Removing abandoned client:', socketId);
        }
    });
}, 60000); // Every minute

// DEBUG

async function saveGameState(statepack: SavedSession) {
    const fileAddress = path.join(__dirname, '..', STATE_FILE);

    try {
        await fs.writeFile(fileAddress, JSON.stringify(statepack, null, 2));
    } catch (error) {
        console.error('Failed to save game state:', error);
    }
}

async function loadGameState(): Promise<object | null> {
    const fileAddress = path.join(__dirname, '..', STATE_FILE);
    try {
        const data = await fs.readFile(fileAddress, 'utf8');

        try {
            return JSON.parse(data);
        } catch (error) {
            console.log('Save file is corrupted', { error });
            return null;
        }

    } catch (error) {
        return null;
    }
}
