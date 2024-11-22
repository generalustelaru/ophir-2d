
import express, { Request, Response } from 'express';
import { WebSocketServer } from 'ws';
import serverConstants from './server_constants';
import { SharedState, PlayerId, WebsocketClientMessage, NewState, GameSetupDetails, GameStatus } from '../shared_types';
import { PrivateState, WssMessage, StateBundle } from './server_types';
import { GameSetupService } from './services/GameSetupService';
import { ToolService } from './services/ToolService';
import { GameSession } from './classes/GameSession';
const httpPort = 3000;
const wsPort = 8080;

const { PLAYER_IDS, DEFAULT_PLAYER_STATE } = serverConstants;
const privateState: PrivateState = {
    moveRules: [],
    tradeDeck: [],
    playerVPs: [],
}

const newState: NewState | SharedState = {
    gameStatus: 'empty',
    sessionOwner: null,
    availableSlots: PLAYER_IDS,
    players: [],
    marketOffer: null,
    setup: null,
}

let singleSession: GameSession | null = null;

const app = express();
app.use(express.static('public'));
app.use(express.static(__dirname));

app.get('/', (req: Request, res: Response) => {
    console.info('GET / from', req.ip);
    res.sendFile(__dirname + 'public/index.html');
});

app.listen(httpPort, () => {
    console.info(`Server running at http://localhost:${httpPort}`);
});

const socketClients: Array<any> = [];
const socketServer = new WebSocketServer({ port: wsPort });
const setupService: GameSetupService = GameSetupService.getInstance();
const tools: ToolService = ToolService.getInstance();

const sendAll = (message: WssMessage) => {
    socketClients.forEach(client => {
        client.send(JSON.stringify(message));
    });
}

const send = (client: any, message: WssMessage) => {
    client.send(JSON.stringify(message));
}

socketServer.on('connection', function connection(client) {

    socketClients.push(client);

    client.on('message', function incoming(message: string) {

        const parsedMessage = JSON.parse(message) as WebsocketClientMessage;
        const { playerId, action, details } = parsedMessage;
        const colorized = {
            playerPurple: '\x1b[95mplayerPurple\x1b[0m',
            playerYellow: '\x1b[93mplayerYellow\x1b[0m',
            playerRed: '\x1b[91mplayerRed\x1b[0m',
            playerGreen: '\x1b[92mplayerGreen\x1b[0m',
        }
        const clientName = playerId ? colorized[playerId] : 'anon';
        console.info(
            '%s -> %s%s',
            clientName,
            action ?? '?',
            details ? `: ${JSON.stringify(details)}` : ': { ¯\\_(ツ)_/¯ }',
        );

        if (action === 'inquire') {
            send(client, newState);
            return;
        }

        if (!playerId) {
            send(client, { error: 'Player ID is missing' });

            return;
        }

        if (action === 'enroll') {

            if (processPlayer(playerId)) {
                sendAll(newState);
            } else {
                sendAll({ error: `Enrollment failed on ${playerId}` });
            }

            return;
        }

        if (action === 'start') {
            const setupDetails = details as GameSetupDetails;

            if (processGameStart(setupDetails)) {
                sendAll(newState);
            } else {
                sendAll({ error: 'Game start failed' });
            }

            return;
        }
        // in-game player actions are handled in instantiable class
        const session = singleSession as GameSession;
        sendAll(session.processAction(parsedMessage));
    });
});

function processGameStart(details: GameSetupDetails): boolean {

    try {
        const sharedState = newState as SharedState;
        sharedState.gameStatus = 'started';
        sharedState.availableSlots = [];

        const bundle: StateBundle = setupService.produceGameData(sharedState, details.setupCoordinates);

        singleSession = new GameSession(bundle);

        sharedState.players = bundle.sharedState.players;
        sharedState.setup = bundle.sharedState.setup;
        privateState.moveRules = bundle.privateState.moveRules;
    } catch (error) {
        console.error('Game start failed:', error);

        return false;
    }

    return true;
}

function processPlayer(playerId: PlayerId): boolean {
    const incompatibleStatuses: Array<GameStatus> = ['started', 'full'];

    if (incompatibleStatuses.includes(newState.gameStatus)) {
        console.log(`${playerId} cannot enroll`);

        return false;
    }

    if (false == PLAYER_IDS.includes(playerId)) {
        console.log(`${playerId} is not a valid player`);

        return false;
    }

    newState.availableSlots = newState.availableSlots.filter(slot => slot !== playerId);

    const newPlayer = tools.getCopy(DEFAULT_PLAYER_STATE);
    newPlayer.id = playerId;
    newState.players.push(newPlayer);

    console.log(`${playerId} enrolled`);

    if (newState.sessionOwner === null) {
        newState.gameStatus = 'created';
        newState.sessionOwner = playerId;
        console.log(`${playerId} is the session owner`);
    }

    if (newState.availableSlots.length === 0) {
        newState.gameStatus = 'full';
        console.log(`Session is full`);
    }

    return true;
}
