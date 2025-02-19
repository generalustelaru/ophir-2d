''
import process from 'process';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import serverConstants from './server_constants';
import { PlayerColor, ClientRequest, NewState, GameSetupDetails, GameStatus, ChatDetails, ChatEntry, RebindClientDetails, ClientIdResponse, ServerMessage, ResetResponse } from '../shared_types';
import { StateBundle, WsClient } from './server_types';
import { GameSetupService } from './services/GameSetupService';
import { ToolService } from './services/ToolService';
import { GameSession } from './classes/GameSession';
import { randomUUID } from 'crypto';
import readline from 'readline';

const httpAddress = process.env.SERVER_ADDRESS;
const httpPort = process.env.HTTP_PORT;
const wsPort = process.env.WS_PORT && parseInt(process.env.WS_PORT);

if (!httpAddress || !httpPort || !wsPort) {
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

    console.log('Server is shutting down...');
    socketClients.forEach(client => client.socket.close(1000));
    setTimeout(() => {
        socketServer.close();
        console.log('Server off.');
        res.send('Server off.');
        process.exit(0);
    }, 3000);
});

app.listen(httpPort, () => {
    console.info(`Server running at http://${httpAddress}:${httpPort}`);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function promptForServerShutdown(): void {
    rl.question('\n', (input) => {

        if (input == 'shutdown') {
            console.log('Shutting down...');
            rl.close();

            socketClients.forEach(client => client.socket.close(1000));
            setTimeout(() => {
                socketServer.close();
                console.log('Server off.');
                process.exit(0);
            }, 3000);
        } else {
            promptForServerShutdown();
        }
    });
}

promptForServerShutdown();

const socketClients: Array<WsClient> = [];
const socketServer = new WebSocketServer({ port: wsPort });
const setupService: GameSetupService = GameSetupService.getInstance();
const tools: ToolService = ToolService.getInstance();

let lobbyState: NewState = tools.getCopy(serverConstants.DEFAULT_NEW_STATE);
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

    socket.on('message', function incoming(message: string) {

        const parsedRequest = JSON.parse(message) as ClientRequest;
        const { playerColor, playerName, message: payload } = parsedRequest;
        const {action, payload: details} = payload;
        const name = playerName || playerColor || '';
        const colorized = {
            Purple: `\x1b[95m${name}\x1b[0m`,
            Yellow: `\x1b[93m${name}\x1b[0m`,
            Red: `\x1b[91m${name}\x1b[0m`,
            Green: `\x1b[92m${name}\x1b[0m`,
        }
        const clientName = playerColor ? colorized[playerColor] : 'anon';

        if (action !== 'get_status') {
            console.info(
                '%s -> %s%s',
                clientName,
                action ?? '?',
                details ? `: ${JSON.stringify(details)}` : ': { ¯\\_(ツ)_/¯ }',
            );
        }

        if (action === 'rebind_id') {
            const { referenceId, myId } = details as RebindClientDetails;
            const socketClient = socketClients.find(c => c.clientID === referenceId);

            if (socketClient) {
                socketClient.clientID = myId;

                return
            };

            send(socket, { error: 'Client not found' });
        }

        if (action === 'inquire') {
            send(socket, singleSession?.getState() || lobbyState);

            return;
        }

        if (action === 'enroll') {

            if (!playerHasUniqueName(playerName)) {
                send(socket, { error: 'This name is already taken' });

                return;
            }

            if (processPlayer(playerColor, playerName)) {
                addServerMessage(`${playerName ?? playerColor} has joined the game`);
                lobbyState.gameId = randomUUID();
                sendAll(lobbyState);
            } else {
                sendAll({ error: `Enrollment failed on ${playerColor}` });
            }

            return;
        }

        if (action === 'chat' && !singleSession) {
            const chatMessage = details as ChatDetails;
            lobbyState.sessionChat.push({ id: playerColor, name: playerName ?? playerColor, message: chatMessage.input });
            sendAll(lobbyState);

            return;
        }

        if (action === 'start') {
            const setupDetails = details as GameSetupDetails;
            const sessionCreated = processGameStart(setupDetails);

            if (sessionCreated && singleSession) {
                console.log('Game started');
                sendAll(singleSession.getState());
            } else {
                sendAll({ error: 'Game start failed' });
            }

            return;
        }

        if (action === 'reset') {
            console.log('Session is resetting!');
            singleSession = singleSession?.wipeSession() ?? null;
            lobbyState = tools.getCopy(serverConstants.DEFAULT_NEW_STATE);
            const resetResponse: ResetResponse = { resetFrom:  playerName ?? playerColor ?? 'anon' };

            sendAll(resetResponse);

            return;
        }

        if (singleSession) {
            sendAll(singleSession.processAction(parsedRequest));

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

function processGameStart(details: GameSetupDetails): boolean {

    try {
        const bundle: StateBundle = setupService.produceGameData(lobbyState, details.setupCoordinates);
        singleSession = new GameSession(bundle);
    } catch (error) {
        console.error('Game start failed:', error);

        return false;
    }

    return true;
}

function playerHasUniqueName(playerName: string|null): boolean {
    if (!playerName) {
        return true;
    }

    return !lobbyState.players.some(player => player.name === playerName);
}

function processPlayer(playerColor: PlayerColor | null, playerName: string | null): boolean {
    const incompatibleStatuses: Array<GameStatus> = ['started', 'full'];

    if (incompatibleStatuses.includes(lobbyState.gameStatus)) {
        console.log(`${playerColor} cannot enroll`);

        return false;
    }

    if (!playerColor) {
        console.log('Player color is missing');

        return false;
    }

    if (false == serverConstants.PLAYER_IDS.includes(playerColor)) {
        console.log(`${playerColor} is not a valid player`);

        return false;
    }

    lobbyState.availableSlots = lobbyState.availableSlots.filter(slot => slot !== playerColor);

    const newPlayer = tools.getCopy(serverConstants.DEFAULT_PLAYER_STATE);
    newPlayer.id = playerColor;
    newPlayer.name = playerName || playerColor
    lobbyState.players.push(newPlayer);

    console.log(`${playerColor} enrolled`);

    if (lobbyState.sessionOwner === null) {
        lobbyState.gameStatus = 'created';
        lobbyState.sessionOwner = playerColor;
        console.log(`${playerColor} is the session owner`);
    }

    if (lobbyState.availableSlots.length === 0) {
        lobbyState.gameStatus = 'full';
        console.log(`Session is full`);
    }

    return true;
}

function addServerMessage(message: string): void {
    const chatEntry: ChatEntry = { id: null, name: serverConstants.SERVER_NAME, message };
    lobbyState.sessionChat.push(chatEntry);
}
