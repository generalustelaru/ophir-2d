
import express, { Request, Response } from 'express';

import { WebSocketServer } from 'ws';
import constants from '../constants';
import serverConstants from './server_constants';
import { PlayerStates, PlayerId, SharedState, WebsocketClientMessage } from '../shared_types';
import { PrivateState, WssMessage, StateBundle } from './server_types';
import { GameSetupService, GameSetupInterface } from './services/gameSetupService';
import { ToolService, ToolInterface } from './services/toolService';
const httpPort = 3000;
const wsPort = 8080;

const { ACTION, STATUS } = constants;
const { PLAYER_IDS, WS_SIGNAL, PLAYER_STATE } = serverConstants;

const privateState: PrivateState = {
    moveRules: [],
}

const sharedState: SharedState = {
    gameStatus: STATUS.empty,
    sessionOwner: null,
    availableSlots: PLAYER_IDS,
    players: null,
    setup: null,
}

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

const socketClients: any[] = [];
const socketServer = new WebSocketServer({ port: wsPort });
const setupService: GameSetupInterface = GameSetupService.getInstance();
const tools: ToolInterface = ToolService.getInstance();

socketServer.on(WS_SIGNAL.connection, function connection(ws) {

    socketClients.push(ws);
    const sendAll = (message: WssMessage) => {
        socketClients.forEach(client => {
            client.send(JSON.stringify(message));
        });
    }

    const send = (message: WssMessage) => {
        ws.send(JSON.stringify(message));
    }

    ws.on(WS_SIGNAL.message, function incoming(message: string) {

        const { playerId, action, details } = JSON.parse(message) as WebsocketClientMessage;
        const colorized = {
            playerPurple: '\x1b[35mplayerPurple\x1b[0m',
            playerYellow: '\x1b[33mplayerYellow\x1b[0m',
            playerRed: '\x1b[31mplayerRed\x1b[0m',
            playerGreen: '\x1b[32mplayerGreen\x1b[0m',
        }
        const colorizedId = playerId ? colorized[playerId] : '?';
        console.info(
            '%s -> %s %s',
            colorizedId,
            `\x1b[37;1m${action}\x1b[0m` ?? '?',
            details ? `-> ${JSON.stringify(details)}` : '',
        );

        if (action === ACTION.inquire) {
            send(sharedState);
        }

        if (action === ACTION.enroll) {
            const isEnrolled = processPlayer(playerId);

            if (isEnrolled) {
                sendAll(sharedState);
            } else {
                console.debug('Enrollment failed:', playerId);
            }
        }

        if (action === ACTION.start && tools.isRecord(sharedState.players)) {
            sharedState.gameStatus = STATUS.started;
            sharedState.availableSlots = [];

            const bundle: StateBundle = setupService.produceGameData(tools.cc(sharedState));
            sharedState.players = bundle.sharedState.players;
            sharedState.setup = bundle.sharedState.setup;
            privateState.moveRules = bundle.privateState.moveRules;
            sharedState.players = passActiveStatus(tools.cc(sharedState.players));

            sendAll(sharedState);
        }

        if (action === ACTION.move) {
            const player = sharedState.players[playerId];
            const destination = details.hexId;
            const allowed = privateState.moveRules.find(
                rule => rule.from === player.location.hexId
            ).allowed;

            if (allowed.includes(destination)) {
                player.location = { hexId: destination, position: details.position };
                player.allowedMoves = privateState.moveRules.find(
                    rule => rule.from === destination
                ).allowed;
                sharedState.players = passActiveStatus(tools.cc(sharedState.players));
                sendAll(sharedState);
            } else {
                send({ error: 'Illegal move!' });
            }
        }
    });
});

function passActiveStatus<S extends PlayerStates>(states: S): S {
    const playerCount = Object.keys(states).length;
    let nextToken = 1;

    for (const id in states) {
        const playerId = id as PlayerId;
        const player = states[playerId];

        if (player.isActive) {
            nextToken = player.turnOrder === playerCount
                ? 1
                : player.turnOrder + 1;

            player.isActive = false;
        }
    }

    for (const id in states) {
        const playerId = id as PlayerId;
        const player = states[playerId];

        if (player.turnOrder === nextToken) {
            player.isActive = true;
        }
    }

    return states;
}

function processPlayer(playerId: PlayerId): boolean {

    if (sharedState.gameStatus === STATUS.started || sharedState.gameStatus === STATUS.full) {
        console.log(`${playerId} cannot enroll`);

        return false;
    }

    if (false == PLAYER_IDS.includes(playerId)) {
        console.log(`${playerId} is not a valid player`);

        return false;
    }

    sharedState.availableSlots = sharedState.availableSlots.filter(slot => slot != playerId);

    if (sharedState.players === null) {
        sharedState.players = { [playerId]: { ...PLAYER_STATE } } as PlayerStates;
    } else {
        sharedState.players[playerId] = { ...PLAYER_STATE };
    }

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
