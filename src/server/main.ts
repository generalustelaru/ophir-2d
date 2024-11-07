
import express, { Request, Response } from 'express';
import { WebSocketServer } from 'ws';
import sharedConstants from '../shared_constants';
import serverConstants from './server_constants';
import { SharedState, PlayerId, WebsocketClientMessage, NewState, GameSetupDetails } from '../shared_types';
import { PrivateState, WssMessage, StateBundle } from './server_types';
import { GameSetupService, GameSetupInterface } from './services/GameSetupService';
import { ToolService, ToolInterface } from './services/ToolService';
import { GameSession } from './classes/GameSession';
const httpPort = 3000;
const wsPort = 8080;

const { ACTION, STATUS } = sharedConstants;
const { PLAYER_IDS, WS_SIGNAL, DEFAULT_PLAYER_STATE } = serverConstants;
const privateState: PrivateState = {
    moveRules: [],
}

const sharedState: NewState|SharedState = {
    gameStatus: STATUS.empty,
    sessionOwner: null,
    availableSlots: PLAYER_IDS,
    players: [],
    setup: null,
}

let singleSession: GameSession|null = null;

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
const setupService: GameSetupInterface = GameSetupService.getInstance();
const tools: ToolInterface = ToolService.getInstance();

const sendAll = (message: WssMessage) => {
    socketClients.forEach(client => {
        client.send(JSON.stringify(message));
    });
}

const send = (client: any, message: WssMessage) => {
    client.send(JSON.stringify(message));
}

socketServer.on(WS_SIGNAL.connection, function connection(client) {

    socketClients.push(client);

    client.on(WS_SIGNAL.message, function incoming(message: string) {

        const parsedMessage = JSON.parse(message) as WebsocketClientMessage;
        const { playerId, action, details } = parsedMessage;
        const colorized = {
            playerPurple: '\x1b[95mplayerPurple\x1b[0m',
            playerYellow: '\x1b[93mplayerYellow\x1b[0m',
            playerRed: '\x1b[91mplayerRed\x1b[0m',
            playerGreen: '\x1b[92mplayerGreen\x1b[0m',
        }
        const colorizedId = playerId ? colorized[playerId] : '?';
        console.info(
            '%s -> %s%s',
            colorizedId,
            action ?? '?',
            details ? `: ${JSON.stringify(details)}` : '',
        );

        if (action === ACTION.inquire) {
            send(client, sharedState);
            return;
        }

        if(!playerId) {
            send(client, { error: 'Player ID is missing' });

            return;
        }

        if (action === ACTION.enroll) {

            if (processPlayer(playerId)) {
                sendAll(sharedState);
            } else {
                sendAll({ error: `Enrollment failed on ${playerId}` });
            }

            return;
        }

        if (action === ACTION.start) {
            const setupDetails = details as GameSetupDetails;

            if (processGameStart(setupDetails)) {
                sendAll(sharedState);
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
        const gameState = sharedState as SharedState;
        gameState.gameStatus = STATUS.started;
        gameState.availableSlots = [];

        const bundle: StateBundle = setupService.produceGameData(
            tools.getCopy(gameState),
            details.setupCoordinates
        );

        singleSession = new GameSession(bundle);

        gameState.players = bundle.sharedState.players;
        gameState.setup = bundle.sharedState.setup;
        privateState.moveRules = bundle.privateState.moveRules;
    } catch (error) {
        console.error('Game start failed:', error);

        return false;
    }

    return true;
}

function processPlayer(playerId: PlayerId): boolean {

    if ([STATUS.started, STATUS.full].includes(sharedState.gameStatus)) {
        console.log(`${playerId} cannot enroll`);

        return false;
    }

    if (false == PLAYER_IDS.includes(playerId)) {
        console.log(`${playerId} is not a valid player`);

        return false;
    }

    sharedState.availableSlots = sharedState.availableSlots.filter(slot => slot !== playerId);

    const newPlayer = tools.getCopy(DEFAULT_PLAYER_STATE);
    newPlayer.id = playerId;
    sharedState.players.push(newPlayer);

    console.log(`${playerId} enrolled`);

    if (sharedState.sessionOwner === null) {
        sharedState.gameStatus = STATUS.created;
        sharedState.sessionOwner = playerId;
        console.log(`${playerId} is the session owner`);
    }

    if (sharedState.availableSlots.length === 0) {
        sharedState.gameStatus = STATUS.full;
        console.log(`Session is full`);
    }

    return true;
}
