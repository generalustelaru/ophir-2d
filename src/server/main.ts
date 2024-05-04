
import express, { Request, Response } from 'express';

import { WebSocketServer } from 'ws';
import constants from '../constants';
import { GameSetup, PlayerState, PlayerStates, PlayerId,
    ServerState, WebsocketClientMessage, BarrierId } from '../shared_types';
import { LocalSession, BarrierChecks,
    DefaultMoveRule, ProcessedMoveRule,WssMessage } from './server_types';
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
//TODO: Start splitting the server into modules

const DEFAULT_MOVE_RULES: DefaultMoveRule[] = [
    { from: 'center', allowed: ['topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft'], blockedBy: [2, 4, 6, 8, 10, 12] },
    { from: 'topRight', allowed: ['center', 'right', 'topLeft'], blockedBy: [1, 2, 3] },
    { from: 'right', allowed: ['center', 'topRight', 'bottomRight'], blockedBy: [3, 4, 5] },
    { from: 'bottomRight', allowed: ['center', 'right', 'bottomLeft'], blockedBy: [5, 6, 7] },
    { from: 'bottomLeft', allowed: ['center', 'left', 'bottomRight'], blockedBy: [7, 8, 9] },
    { from: 'left', allowed: ['center', 'topLeft', 'bottomLeft'], blockedBy: [9, 10, 11] },
    { from: 'topLeft', allowed: ['center', 'left', 'topRight'], blockedBy: [1, 11, 12] },
]

const BARRIER_CHECKS: BarrierChecks = {
    1: { between: ['topLeft', 'topRight'], incompatible: [11, 12, 2, 3] },
    2: { between: ['topRight', 'center'], incompatible: [12, 1, 3, 4] },
    3: { between: ['topRight', 'right'], incompatible: [1, 2, 4, 5] },
    4: { between: ['right', 'center'], incompatible: [2, 3, 5, 6] },
    5: { between: ['right', 'bottomRight'], incompatible: [3, 4, 6, 7] },
    6: { between: ['bottomRight', 'center'], incompatible: [4, 5, 7, 8] },
    7: { between: ['bottomRight', 'bottomLeft'], incompatible: [5, 6, 8, 9] },
    8: { between: ['bottomLeft', 'center'], incompatible: [6, 7, 9, 10] },
    9: { between: ['bottomLeft', 'left'], incompatible: [7, 8, 10, 11] },
    10: { between: ['left', 'center'], incompatible: [8, 9, 11, 12] },
    11: { between: ['left', 'topLeft'], incompatible: [9, 10, 12, 1] },
    12: { between: ['topLeft', 'center'], incompatible: [10, 11, 1, 2] },
}

const PLAYER_IDS: PlayerId[] = [
    'playerPurple',
    'playerYellow',
    'playerRed',
    'playerGreen',
];

const PLAYER_STATE: PlayerState = { // TODO: Implement Influence logic (rolling d6 on moving to an occupied hex). Will require keeping track of last position and plauers' current influence in state.
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
    availableSlots: PLAYER_IDS,
    players: null,
    setup: null,
}

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

        const { playerId, action, details } = JSON.parse(message) as WebsocketClientMessage;
        console.info(
            '%s -> %s %s',
            playerId ?? '?',
            action ?? '?',
            details ? `& ${JSON.stringify(details)}` : ''
        );

        if (action === ACTION.inquire) {
            send(session);
        }

        if (action === ACTION.enroll) {
            const isEnrolled = processPlayer(playerId);

            if (isEnrolled) {
                sendAll(session);
            } else {
                console.debug('Enrollment failed:', playerId);
            }
        }

        if (action === ACTION.start && isRecord(session.players)) {
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

        if (action === ACTION.move) {
            const player = session.players[playerId];
            const destination = details.hexId;
            const allowed = localSession.moveRules.find(
                rule => rule.from === player.location.hexId
            ).allowed;

            if (allowed.includes(destination)) {
                player.location = { hexId: destination, position: details.position };
                player.allowedMoves = localSession.moveRules.find(
                    rule => rule.from === destination
                ).allowed;
                session.players = passActiveStatus(cc(session.players));
                sendAll(session);
            } else {
                send({ error: 'Illegal move!' });
            }
        }

    });
});

function processPlayer(playerId: PlayerId): boolean {

    if (session.status === STATUS.started || session.status === STATUS.full) {
        console.log(`${playerId} cannot enroll`);

        return false;
    }

    if (false == PLAYER_IDS.includes(playerId)) {
        console.log(`${playerId} is not a valid player`);

        return false;
    }

    session.availableSlots = session.availableSlots.filter(slot => slot != playerId);

    if (session.players === null) {
        session.players = { [playerId]: { ...PLAYER_STATE } } as PlayerStates;
    } else {
        session.players[playerId] = { ...PLAYER_STATE };
    }

    console.log(`${playerId} enrolled`);

    if (session.sessionOwner === null) {
        session.status = STATUS.created;
        session.sessionOwner = playerId;
        console.log(`${playerId} is the session owner`);
    }

    if (session.availableSlots.length === 0) {
        session.status = STATUS.full;
        console.log(`Session is full`);
    }

    return true;
}

function assignTurnOrder<S extends PlayerStates>(states: S): S {
    const playerIds = Object.keys(states) as PlayerId[];
    let tokenCount = playerIds.length;

    while (tokenCount > 0) {
        const randomPick = Math.floor(Math.random() * playerIds.length);
        const playerId = playerIds.splice(randomPick, 1)[0];
        states[playerId].turnOrder = tokenCount;
        tokenCount -= 1;
    }

    return passActiveStatus(states);
}

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

function generateSetup(barrierChecks: BarrierChecks): GameSetup {
    const setup = {
        barriers: determineBarriers(barrierChecks),
        //TODO: settlements: determineSettlements(), // Collection<hexId, settlementId> // Settlements should be implemented after the influence and favor mechanics are in place
    }

    return setup;
}

function determineBarriers (barrierChecks: BarrierChecks): BarrierId[] {

    const b1 = Math.ceil(Math.random() * 12) as BarrierId;
    let b2: BarrierId = null;

    while (false === isArrangementLegal(barrierChecks, b1, b2)) {
        b2 = Math.ceil(Math.random() * 12) as BarrierId;
    }

    return [b1, b2];
}

function isArrangementLegal (
    barrierChecks: BarrierChecks, b1: BarrierId, b2: BarrierId
): boolean {

    if (!b2 || b1 === b2) {
        return false;
    }

    const check = barrierChecks[b1];

    if (check.incompatible.find(id => id === b2)) {
        return false;
    }

    return true;
}

function filterAllowedMoves (
    defaultMoves: DefaultMoveRule[],
    barrierChecks: BarrierChecks,
    barrierIds: BarrierId[]
): ProcessedMoveRule[] {
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

function hydrateMoveRules <S extends PlayerStates> (
    states: S, moveRules: ProcessedMoveRule[]
): S {
    const initialPlacement = moveRules[0];

    for (const id in states) {
        const playerId = id as PlayerId;
        const player = states[playerId];

        player.location = {
            hexId: initialPlacement.from,
            position: null};
        player.allowedMoves = initialPlacement.allowed;
    }

    return states;
}


function isRecord (obj: object): boolean {

    return obj.constructor === Object && Object.keys(obj).length > 0;
}
/**
 * Deep copy a data object
 * 'cc' stands for carbon copy/copycat/clear clone/cocopuffs etc.
 *
 * @param obj - JSON-compatible object to copy
 */
function cc <O extends object> (obj: O): O {

    return JSON.parse(JSON.stringify(obj));
}