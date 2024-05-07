
import express, { Request, Response } from 'express';
import { WebSocketServer } from 'ws';
import sharedConstants from '../shared_constants';
import serverConstants from './server_constants';
import { SharedState, HexId, PlayerStates, PlayerState, PlayerId, WebsocketClientMessage, MoveActionDetails, } from '../shared_types';
import { PrivateState, WssMessage, StateBundle } from './server_types';
import { GameSetupService, GameSetupInterface } from './services/gameSetupService';
import { ToolService, ToolInterface } from './services/toolService';
const httpPort = 3000;
const wsPort = 8080;

const { ACTION, STATUS } = sharedConstants;
const { PLAYER_IDS, WS_SIGNAL, PLAYER_STATE } = serverConstants;
// TODO: move all session-related state and functionality into (a) GamerSession class
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

        if (action === ACTION.start) {
            const isGameReady = processGameStart();

            if (isGameReady) {
                sharedState.players = passActiveStatus(
                    tools.cc(sharedState.players)
                );

                return sendAll(sharedState);
            }

            sendAll({ error: 'Game start failed' });
        }

        if (action === ACTION.move) {
            const isMoveLegal = processMove(playerId, details);

            if (isMoveLegal) {
                sendAll(sharedState);
            } else {
                sendAll({ error: `Illegal move on ${playerId}` });
            }
        }

        if (action === ACTION.turn) {
            sharedState.players = passActiveStatus(tools.cc(sharedState.players));
            sendAll(sharedState);
        }
    });
});

function passActiveStatus(states: PlayerStates): PlayerStates {
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
            states[playerId] = setTurnStartConditions(tools.cc(player));
        }
    }

    return states;
}

function processMove(playerId: PlayerId, details: MoveActionDetails): boolean {

    const player = sharedState.players[playerId];
    const departure = player.location.hexId;
    const destination  = details.hexId;
    const remainingMoves = player.moveActions;
    const allowed = privateState.moveRules.find(rule => rule.from === departure).allowed;

    if (allowed.includes(destination) && remainingMoves > 0) {
        player.moveActions = remainingMoves - 1;

        const manifest = getPortManifest(sharedState.players, destination);
        const sailSuccess = manifest
            ? handleInfluenceRoll(player, manifest)
            : true;

        if (sailSuccess) {
            player.location = { hexId: destination, position: details.position };
            player.allowedMoves = privateState.moveRules
            .find(rule => rule.from === destination).allowed
            .filter(move => move !== departure);
            player.isAnchored = true;
        }

        if (player.moveActions === 0 && false === sailSuccess) {
            sharedState.players = passActiveStatus(tools.cc(sharedState.players));
        }

        return true;
    }

    return false;
}

type ManifestItem = { id: PlayerId, influence: number };
function getPortManifest (players: PlayerStates, destinationHex: HexId): ManifestItem[] | false {
    const manifest = [];

    for (const id in players) {
        const playerId = id as PlayerId;
        const player = players[playerId];

        if (player.location.hexId === destinationHex) {
            manifest.push({ id: playerId, influence: player.influence });
        }
    }

    if (manifest.length === 0) {
        return false;
    }

    return manifest;
}

function handleInfluenceRoll (activePlayer: PlayerState, manifest:ManifestItem[] ): boolean {
    let canMove = true;

    activePlayer.influence = Math.ceil(Math.random() * 6);
    let highestInfluence = activePlayer.influence;

    manifest.forEach(item => {
        if (item.influence > highestInfluence) {
            canMove = false;
            highestInfluence = item.influence;
        }
    });

    if (canMove) {
        return true;
    }

    for (const id in sharedState.players) {
        const playerId = id as PlayerId;
        const player = sharedState.players[playerId];

        if (player.influence === highestInfluence) {
            player.influence -= 1;
        }
    }

    return false;
}

function processGameStart(): boolean{

    try {
        sharedState.gameStatus = STATUS.started;
        sharedState.availableSlots = [];

        const bundle: StateBundle = setupService.produceGameData(
            tools.cc(sharedState)
        );
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

    if (
        sharedState.gameStatus === STATUS.started
        || sharedState.gameStatus === STATUS.full
    ) {
        console.log(`${playerId} cannot enroll`);

        return false;
    }

    if (false == PLAYER_IDS.includes(playerId)) {
        console.log(`${playerId} is not a valid player`);

        return false;
    }

    sharedState.availableSlots = sharedState.availableSlots
        .filter(slot => slot != playerId);

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

function setTurnStartConditions(player: PlayerState): PlayerState {;
    player.isActive = true;
    player.isAnchored = false;
    player.moveActions = 2;
    player.allowedMoves = privateState.moveRules
        .find(rule => rule.from === player.location.hexId).allowed;

    return player;
}