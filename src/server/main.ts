import process from 'process';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { ClientIdResponse, ServerMessage, ResetResponse, Action, ClientRequest, WaiverClientPayload } from '../shared_types';
import { WsClient } from './server_types';
import tools from './services/ToolService';
import { GameSession } from './GameSession';
import { validator } from "./services/validation/ValidatorService";
import { randomUUID } from 'crypto';
import readline from 'readline';

import { SERVER_ADDRESS, HTTP_PORT, WS_PORT, SERVER_NAME } from './configuration';

if (!SERVER_ADDRESS || !HTTP_PORT || !WS_PORT) {
    console.error('Missing environment variables');
    process.exit(1);
}

// MARK: PROCESS
process.on('SIGINT', () => {
    broadcast({ error: 'The server is shutting down :(' });
    socketServer.close();
    console.log('Shutting down...');
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
    if (req.query.auth !== process.env.SHUTDOWN_AUTH) {
        console.error('Unauthorized shutdown attempt');
        res.status(401).send('Unauthorized');

        return;
    }

    console.warn('Remote server shutdown!');
    res.status(200).send('OK');
    shutDown();
});

app.listen(HTTP_PORT, () => {
    console.info(`Server running at http://${SERVER_ADDRESS}:${HTTP_PORT}`);
});

// MARK: CLI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
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
const socketClients: Array<WsClient> = [];
const socketServer = new WebSocketServer({ port: WS_PORT });

const singleSession = new GameSession();

socketServer.on('connection', function connection(socket) {
    const clientId = randomUUID();
    const response: ClientIdResponse = { clientId };
    socket.send(JSON.stringify(response));
    socketClients.push({ clientID: clientId, gameID: null, socket: socket });

    socket.on('message', function incoming(req: string) {
        const clientRequest = validator.validateClientRequest(tools.parse(req));

        if (!clientRequest)
            return respond(socket, { error: 'Invalid request data.' });

        const { action, payload } = clientRequest.message;

        if (action === Action.waiver_client)
            return waiverClient(socket, payload);

        logRequest(clientRequest);
        const response = singleSession.processAction(clientRequest);

        if (response.senderOnly)
            return respond(socket, response.message);

        return broadcast(response.message);
    });
});

// MARK: FUNCTIONS
function logRequest(request: ClientRequest) {
    const { playerColor, playerName, message } = request;
    const { action, payload } = message;

    if (action === Action.get_status)
        return;

    const name = playerName || playerColor || '';
    const colorized = {
        Purple: `\x1b[95m${name}\x1b[0m`,
        Yellow: `\x1b[93m${name}\x1b[0m`,
        Red: `\x1b[91m${name}\x1b[0m`,
        Green: `\x1b[92m${name}\x1b[0m`,
    }
    const clientName = playerColor ? colorized[playerColor] : 'anon';

    console.info(
        '%s -> %s%s',
        clientName,
        action ?? '?',
        payload ? `: ${JSON.stringify(payload)}` : ': { }',
    );
}

function waiverClient(socket: WebSocket, payload: WaiverClientPayload) {
    const waiverPayload = validator.validateRebindClientPayload(payload)

    if (!waiverPayload) {
        respond(socket, { error: 'Invalid request format.' });

        return;
    }

    const { waiveredId, myId } = waiverPayload;
    const originalClient = socketClients.find(c => c.clientID === myId);
    const waiveredClient = socketClients.find(c => c.clientID === waiveredId);

    if (originalClient && waiveredClient)
        waiveredClient.socket.close;
    else
        respond(socket, { error: 'Cannot find clients.' });
}

function shutDown() {
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
    console.log('Session is resetting!');
    singleSession.resetSession();
    const resetMessage: ResetResponse = { resetFrom: SERVER_NAME };

    broadcast(resetMessage);
}

function broadcast(message: ServerMessage): void {
    socketClients.forEach(client => {
        client.socket.send(JSON.stringify(message));
    });
}

function respond(client: WebSocket, message: ServerMessage): void {
    client.send(JSON.stringify(message));
}
