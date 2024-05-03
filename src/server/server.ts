// @ts-ignore
import express from 'express';

import { WebSocketServer } from 'ws';
import constants from '../constants';
import { PlayerState, PlayerId, ServerState, WebsocketClientMessage, BarrierId } from '../shared_types';
import { LocalSession, BarrierChecks, DefaultMoveRule, ProcessedMoveRule, WssMessage} from './server_types';
const app = express();
const httpPort = 3000;
const wsPort = 8080;

const { ACTION, STATUS } = constants;

app.use(express.static('public'));

const WS_SIGNAL = {
    connection: 'connection',
    message: 'message',
    close: 'close',
}

const DEFAULT_MOVE_RULES: DefaultMoveRule[] = [
    { from: 'center', allowed: ['topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft'], blockedBy: [2,4,6,8,10,12] },
    { from: 'topRight', allowed: ['center', 'right', 'topLeft'], blockedBy: [1,2,3] },
    { from: 'right', allowed: ['center', 'topRight', 'bottomRight'], blockedBy: [3,4,5] },
    { from: 'bottomRight', allowed: ['center', 'right', 'bottomLeft'], blockedBy: [5,6,7] },
    { from: 'bottomLeft', allowed: ['center', 'left', 'bottomRight'], blockedBy: [7,8,9] },
    { from: 'left', allowed: ['center', 'topLeft', 'bottomLeft'], blockedBy: [9,10,11] },
    { from: 'topLeft', allowed: ['center', 'left', 'topRight'], blockedBy: [1,11,12] },
]

const BARRIER_CHECKS: BarrierChecks = {
    1: { between: ['topLeft', 'topRight'], incompatible: [11,12,2,3] },
    2: { between: ['topRight', 'center'], incompatible: [12,1,3,4] },
    3: { between: ['topRight', 'right'], incompatible: [1,2,4,5] },
    4: { between: ['right', 'center'], incompatible: [2,3,5,6] },
    5: { between: ['right', 'bottomRight'], incompatible: [3,4,6,7] },
    6: { between: ['bottomRight', 'center'], incompatible: [4,5,7,8] },
    7: { between: ['bottomRight', 'bottomLeft'], incompatible: [5,6,8,9] },
    8: { between: ['bottomLeft', 'center'], incompatible: [6,7,9,10] },
    9: { between: ['bottomLeft', 'left'], incompatible: [7,8,10,11] },
    10: { between: ['left', 'center'], incompatible: [8,9,11,12] },
    11: { between: ['left', 'topLeft'], incompatible: [9,10,12,1] },
    12: { between: ['topLeft', 'center'], incompatible: [10,11,1,2] },
}

const PLAYER_IDS = [
    'playerPurple',
    'playerYellow',
    'playerRed',
    'playerGreen',
];

const PLAYER_STATE: PlayerState = {
    turnOrder: null,
    isActive: false,
    location: null,
    allowedMoves: null,
};

const localSession: LocalSession = {
    moveRules: [],
}
const session: ServerState = {
    status: STATUS.empty,
    sessionOwner: null,
    availableSlots: [...PLAYER_IDS],
    players: null,
    setup: null,
}

app.get('/', (req: any, res: any) => { // TODO: see if you can handle express and type the heck out of this too.
    console.info('GET / from', req.ip);
    res.sendFile(__dirname + '../public/index.html');
});

app.listen(httpPort, () => {
    console.info(`Server running at http://localhost:${httpPort}`);
});

const socketClients: any[] = [];
const socketServer = new WebSocketServer({ port: wsPort });

socketServer.on(WS_SIGNAL.connection, function connection(ws) {

    socketClients.push(ws);
    console.log('New client connection or page refresh');
    const sendAll = (message: WssMessage) => {
        socketClients.forEach(client => {
            client.send(JSON.stringify(message));
        });
    }

    const send = (message: WssMessage) => {
        ws.send(JSON.stringify(message));
    }

    ws.on(WS_SIGNAL.message, function incoming(message: string) {
        try {
            const { playerId, action, details } = JSON.parse(message) as WebsocketClientMessage;
            console.info(
                '%s -> %s %s',
                playerId ?? '?',
                action ?? '?',
                details ? `& ${JSON.stringify(details)}` : ''
            );

            const player = playerId ? session.players[playerId] : null;

            if (action == ACTION.inquire) {
                send(session);
            }

            if (action == ACTION.enroll) {
                const isEnrolled = processPlayer(playerId);

                if (isEnrolled) {
                    sendAll(session);
                } else {
                    console.debug('Enrollment failed:', playerId);
                }
            }

            if (action == ACTION.start) {
                session.status = STATUS.started;
                session.availableSlots = [];
                session.players = assignTurnOrder(cc(session.players));
                session.setup = generateSetup(cc(BARRIER_CHECKS));
                localSession.moveRules = filterAllowedMoves(
                    cc(DEFAULT_MOVE_RULES),
                    cc(BARRIER_CHECKS),
                    cc(session.setup.barriers)
                );
                session.players = hydrateMoveRules(
                    cc(session.players),
                    cc(localSession.moveRules)
                );

                sendAll(session);
            }

            if (action == ACTION.move) {
                const destination = details.hexId;
                const allowed = localSession.moveRules.find(rule => rule.from === player.location.hexId).allowed;

                if (allowed.includes(destination)) {
                    player.location = { hexId: destination, position: details.position };
                    player.allowedMoves = localSession.moveRules.find(rule => rule.from === destination).allowed;
                    session.players = passActiveStatus(cc(session.players));
                    sendAll(session);
                } else {
                    send({ error: 'Illegal move!' });
                }
            }
        } catch (error) {
            console.log(error.message);
            console.log(`original message: ${message}`);
        }
    });
});

function processPlayer(playerId: PlayerId) {

    if (session.status === STATUS.started || session.status === STATUS.full) {
        console.log(`${playerId} cannot enroll`);

        return false;
    }

    if (false == PLAYER_IDS.includes(playerId)) {
        console.log(`${playerId} is not a valid player`);

        return false;
    }

    session.availableSlots = session.availableSlots.filter(slot => slot != playerId);
    session.players[playerId] = { ...PLAYER_STATE };
    console.log(`${playerId} enrolled`);

    if (session.sessionOwner === null) {
        session.status = STATUS.lobby;
        session.sessionOwner = playerId;
        console.log(`${playerId} is the session owner`);
    }

    if (session.availableSlots.length === 0) {
        session.status = STATUS.full;
        console.log(`Session is full`);
    }

    return true;
}

function assignTurnOrder(playersObject: Record<PlayerId, PlayerState>) {
    const players = Object.keys(playersObject) as PlayerId[];
    let tokenCount = players.length;

    while (tokenCount > 0) {
        const randomPick = Math.floor(Math.random() * players.length);
        const playerId = players.splice(randomPick, 1)[0];
        playersObject[playerId].turnOrder = tokenCount;
        tokenCount -= 1;
    }

    return passActiveStatus(playersObject);
}

function passActiveStatus(playersObject: Record<PlayerId, PlayerState>) {
    const playerCount = Object.keys(playersObject).length;
    let nextToken = 1;

    for (const id in playersObject) {
        const playerId = id as PlayerId;

        if (playersObject[playerId].isActive) {
            nextToken = playersObject[playerId].turnOrder === playerCount
            ? 1
            : playersObject[playerId].turnOrder + 1;

            playersObject[playerId].isActive = false;
        }
    }

    for (const id in playersObject) {
        const playerId = id as PlayerId;

        if (playersObject[playerId].turnOrder === nextToken) {
            playersObject[playerId].isActive = true;
        }
    }

    return playersObject;
}

function generateSetup(barrierChecks: BarrierChecks) {
    const setup = {
        barriers: determineBarriers(barrierChecks),
        // settlements: determineSettlements(), // Collection<hexId, settlementId>
    }

    return setup;
}

function determineBarriers(barrierChecks: BarrierChecks) {

    const b1 = Math.ceil(Math.random() * 12) as BarrierId;
    let b2: BarrierId = null;

    while (false === checkBarrierCompatibility(barrierChecks, b1, b2)) {
        b2 = Math.ceil(Math.random() * 12)  as BarrierId;
    }

    return [b1,b2];
}

function checkBarrierCompatibility(barrierChecks: BarrierChecks, b1: BarrierId, b2: BarrierId) {

    if (!b2 || b1 === b2) {
        return false
    }

    const check = barrierChecks[b1];

    if (check.incompatible.find(id => id === b2)) {
        return false
    }

    return true
}

function filterAllowedMoves(defaultMoves: DefaultMoveRule[], barrierChecks: BarrierChecks, barrierIds: BarrierId[]) {

    const filteredMoves: ProcessedMoveRule[] = [];

    defaultMoves.forEach(moveRule => {

        barrierIds.forEach(barrierId => {

            if (moveRule.blockedBy.find(id => id === barrierId)) {
                const neighborHex = barrierChecks[barrierId].between
                    .filter(hexId => hexId != moveRule.from)[0];

                    moveRule.allowed = moveRule.allowed
                    .filter(hexId => hexId != neighborHex);
            }
        });

        filteredMoves.push({
            from: moveRule.from,
            allowed: moveRule.allowed,
        });
    });

    return filteredMoves;
}

function hydrateMoveRules(
    playersObject: Record<PlayerId, PlayerState>,
    moveRules: ProcessedMoveRule[],
) {

    const { from, allowed } = moveRules[0];

    for (const id in playersObject) {
        const playerId = id as PlayerId;

        playersObject[playerId].location = {hexId: from, position: null};
        playersObject[playerId].allowedMoves = allowed;
    }

    return playersObject;
}

/**
 * Deep copy an object
 * !! only for data objects containing scalars and arrays of scalars !!
 * 'cc' stands for carbon copy/copycat/clear clone/cocopuffs etc.;
 */
function cc(obj: unknown) {
    return JSON.parse(JSON.stringify(obj));
}