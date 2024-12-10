''
import process from 'process';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import serverConstants from './server_constants';
import { PlayerId, WebsocketClientMessage, NewState, GameSetupDetails, GameStatus, ChatDetails, ChatEntry } from '../shared_types';
import { WssMessage, StateBundle, WsClient } from './server_types';
import { GameSetupService } from './services/GameSetupService';
import { ToolService } from './services/ToolService';
import { GameSession } from './classes/GameSession';
import { randomUUID } from 'crypto';

const httpAddress = process.env.SERVER_ADDRESS;
const httpPort = process.env.HTTP_PORT;
const wsPort = parseInt(process.env.WS_PORT ?? '0');

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

app.listen(httpPort, () => {
    console.info(`Server running at http://${httpAddress}:${httpPort}`);
});

const socketClients: Array<WsClient> = [];
const socketServer = new WebSocketServer({ port: wsPort });
const setupService: GameSetupService = GameSetupService.getInstance();
const tools: ToolService = ToolService.getInstance();

const sessionId = randomUUID();
let lobbyState: NewState = tools.getCopy(serverConstants.DEFAULT_NEW_STATE);
lobbyState.gameId = sessionId;
let singleSession: GameSession | null = null;

function sendAll (message: WssMessage): void {
    socketClients.forEach(client => {
        client.socket.send(JSON.stringify(message));
    });
}

function send (client: WebSocket, message: WssMessage): void {
    client.send(JSON.stringify(message));
}

socketServer.on('connection', function connection(client) {

    socketClients.push({ gameID: sessionId, socket: client });

    client.on('message', function incoming(message: string) {

        const parsedMessage = JSON.parse(message) as WebsocketClientMessage;
        const { playerId, playerName, payload } = parsedMessage;
        const {action, details} = payload;
        const name = playerName || playerId || '';
        const colorized = {
            playerPurple: `\x1b[95m${name}\x1b[0m`,
            playerYellow: `\x1b[93m${name}\x1b[0m`,
            playerRed: `\x1b[91m${name}\x1b[0m`,
            playerGreen: `\x1b[92m${name}\x1b[0m`,
        }
        const clientName = playerId ? colorized[playerId] : 'anon';
        console.info(
            '%s -> %s%s',
            clientName,
            action ?? '?',
            details ? `: ${JSON.stringify(details)}` : ': { ¯\\_(ツ)_/¯ }',
        );

        if (action === 'inquire') {
            send(client, singleSession?.getState() || lobbyState);

            return;
        }

        if (!playerId) {
            send(client, { error: 'Player ID is missing' });

            return;
        }

        if (action === 'enroll') {

            if (!playerHasUniqueName(playerName)) {
                send(client, { error: 'This name is already taken' });

                return;
            }

            if (processPlayer(playerId, playerName)) {
                addServerMessage(`${playerName} has joined the game`);
                sendAll(lobbyState);
            } else {
                sendAll({ error: `Enrollment failed on ${playerId}` });
            }

            return;
        }

        if (action === 'chat' && !singleSession) {
            const chatMessage = details as ChatDetails;
            lobbyState.sessionChat.push({ id: playerId, name: playerName || playerId, message: chatMessage.message });
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
            singleSession = null;
            lobbyState = tools.getCopy(serverConstants.DEFAULT_NEW_STATE);

            sendAll(serverConstants.RESET_STATE);

            return;
        }

        if (singleSession) {
            sendAll(singleSession.processAction(parsedMessage));

            return;
        }

        send(client, { error: 'Request cannot be handled' });
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

function processPlayer(playerId: PlayerId, playerName: string|null): boolean {
    const incompatibleStatuses: Array<GameStatus> = ['started', 'full'];

    if (incompatibleStatuses.includes(lobbyState.gameStatus)) {
        console.log(`${playerId} cannot enroll`);

        return false;
    }

    if (false == serverConstants.PLAYER_IDS.includes(playerId)) {
        console.log(`${playerId} is not a valid player`);

        return false;
    }

    lobbyState.availableSlots = lobbyState.availableSlots.filter(slot => slot !== playerId);

    const newPlayer = tools.getCopy(serverConstants.DEFAULT_PLAYER_STATE);
    newPlayer.id = playerId;
    newPlayer.name = playerName || playerId
    lobbyState.players.push(newPlayer);

    console.log(`${playerId} enrolled`);

    if (lobbyState.sessionOwner === null) {
        lobbyState.gameStatus = 'created';
        lobbyState.sessionOwner = playerId;
        console.log(`${playerId} is the session owner`);
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
