import process from 'process';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import serverConstants from './server_constants';
import { LobbyState, GameSetupPayload, ClientIdResponse, ServerMessage, ResetResponse, Action } from '../shared_types';
import { StateBundle, WsClient } from './server_types';
import { gameSetupService } from './services/GameSetupService';
import { ToolService } from './services/ToolService';
import { GameSession } from './classes/GameSession';
import { validator } from "./services/validation/ValidatorService";
import { EnrolmentService } from './services/session/EnrolmentService';
import { randomUUID } from 'crypto';
import readline from 'readline';

import { SERVER_ADDRESS, HTTP_PORT, WS_PORT, SERVER_NAME } from './configuration';

if (!SERVER_ADDRESS || !HTTP_PORT || !WS_PORT) {
    console.error('Missing environment variables');
    process.exit(1);
}

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
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
    singleSession = singleSession?.wipeSession() ?? null;
    lobbyState = tools.getCopy(serverConstants.DEFAULT_NEW_STATE);
    const resetMessage: ResetResponse = { resetFrom: SERVER_NAME };

    sendAll(resetMessage);
}
function promptForInput(): void {
    rl.question('\n', (input) => {

        switch(input) {
            case 'shutdown':
                shutDown();
            return;

            case 'reset':
                reset();
            break;
        }

        promptForInput();
    });
}
promptForInput();

const socketClients: Array<WsClient> = [];
const socketServer = new WebSocketServer({ port: WS_PORT });
// const setupService: GameSetupService = GameSetupService.getInstance();
const tools = new ToolService();
const enroller = new EnrolmentService();

let lobbyState: LobbyState = tools.getCopy(serverConstants.DEFAULT_NEW_STATE);
lobbyState.gameId = randomUUID();
let singleSession: GameSession | null = null;

function sendAll (message: ServerMessage): void {
    socketClients.forEach(client => {
        client.socket.send(JSON.stringify(message));
    });
}

function send (client: WebSocket, message: ServerMessage): void {
    client.send(JSON.stringify(message));
}

socketServer.on('connection', function connection(socket) {
    const clientId = randomUUID();
    const response: ClientIdResponse = { clientId };
    socket.send(JSON.stringify(response));
    socketClients.push({ clientID: clientId, gameID: null, socket: socket });

    socket.on('message', function incoming(req: string) {

        const clientRequest = validator.validateClientRequest(
            tools.parse(req),
        );

        if (!clientRequest) {
            send(socket, {error: 'Invalid request data.'});

            return;
        }

        const { playerColor, playerName, message } = clientRequest;
        const { action, payload } = message;
        const name = playerName || playerColor || '';
        const colorized = {
            Purple: `\x1b[95m${name}\x1b[0m`,
            Yellow: `\x1b[93m${name}\x1b[0m`,
            Red: `\x1b[91m${name}\x1b[0m`,
            Green: `\x1b[92m${name}\x1b[0m`,
        }
        const clientName = playerColor ? colorized[playerColor] : 'anon';

        if (action !== Action.get_status) {
            console.info(
                '%s -> %s%s',
                clientName,
                action ?? '?',
                payload ? `: ${JSON.stringify(payload)}` : ': { ¯\\_(ツ)_/¯ }',
            );
        }

        if (action === Action.rebind_id) {
            const rebindPayload = validator.validateRebindClientPayload(payload)

            if (!rebindPayload) {
                send(socket, { error: 'Invalid request format.' });

                return;
            }

            const { referenceId, myId } = rebindPayload;
            const abandonedClient = socketClients.find(c => c.clientID === myId);
            const socketClient = socketClients.find(c => c.clientID === referenceId);

            if (!abandonedClient || !socketClient) {
                send(socket, { error: 'Client not found.' });

                return;
            };

            abandonedClient.socket.close;
            socketClient.clientID = myId;

            return;
        }

        if (action === Action.inquire) {
            const stateResponse = singleSession
                ? { game: singleSession.getState() }
                : { lobby: lobbyState };

            send(socket, stateResponse);

            return;
        }

        if (action === Action.enroll) {
            const message = enroller.processEnrol(lobbyState, playerColor, playerName);

            if ('error' in message) {
                send(socket, message);
            } else {
                lobbyState = message.lobby;
                sendAll(message);
            }

            return;
        }

        if (action === Action.chat && !singleSession) {
            const chatMessage = validator.validateChatPayload(payload);

            if (!chatMessage) {
                send(socket, { error: `Could not process chat message on ${playerColor}` })
                return;
            }

            lobbyState.chat.push({
                id: playerColor,
                name: playerName ?? playerColor,
                message: chatMessage.input,
            });
            sendAll({ lobby: lobbyState });

            return;
        }

        if (action === Action.start) {
            const setupDetails = validator.validateGameSetupPayload(payload);

            if (!setupDetails) {
                sendAll({error: 'Could not process setup request.'})

                return;
            }

            const sessionCreated = processGameStart(setupDetails);

            if (sessionCreated && singleSession) {
                console.log('Game started');
                sendAll({ game: singleSession.getState() });
            } else {
                sendAll({ error: 'Game start failed' });
            }

            return;
        }

        if (action === Action.reset) {
            if (lobbyState.sessionOwner !== playerColor) {
                send(socket, { error: 'Only session owner may reset.'});

                return;
            }

            console.log('Session is resetting!');
            singleSession = singleSession?.wipeSession() ?? null;
            lobbyState = tools.getCopy(serverConstants.DEFAULT_NEW_STATE);
            const resetResponse: ResetResponse = { resetFrom:  playerName ?? playerColor ?? 'anon' };

            sendAll(resetResponse);

            return;
        }

        if (singleSession) {
            const response = singleSession.processAction(clientRequest);

            if ('error' in response)
                send(socket, response);
            else
                sendAll(response);

            return;
        }

        send(socket, { error: 'Request cannot be handled' });
    });
});

process.on('SIGINT', () => {
    sendAll({error: 'The server is shutting down :('});
    socketServer.close();
    console.log('Shutting down...');
    process.exit(0);
});

function processGameStart(payload: GameSetupPayload): boolean {

    try {
        const bundle: StateBundle = gameSetupService.produceGameData(lobbyState, payload);
        singleSession = new GameSession(bundle);
    } catch (error) {
        console.error('Game start failed:', error);

        return false;
    }

    return true;
}

