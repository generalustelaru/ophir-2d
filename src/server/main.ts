
import express, { Request, Response } from 'express';

import { WebSocketServer } from 'ws';
import constants from '../constants';
import serverConstants from './server_constants';
import { PlayerStates, PlayerId, ServerState, WebsocketClientMessage } from '../shared_types';
import { LocalSession, WssMessage } from './server_types';
import { GameSetupService } from './services/gameSetupService';
const app = express();
const httpPort = 3000;
const wsPort = 8080;

const { ACTION, STATUS } = constants;
const { DEFAULT_MOVE_RULES, BARRIER_CHECKS, PLAYER_IDS, WS_SIGNAL } = serverConstants;
app.use(express.static('public'));

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
const setupService = new GameSetupService(session);

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
            send(session);
        }

        if (action === ACTION.enroll) {
            const isEnrolled = setupService.processPlayer(playerId);

            if (isEnrolled) {
                sendAll(session);
            } else {
                console.debug('Enrollment failed:', playerId);
            }
        }

        // TODO: Move all calls into gameSetupService and expose a single method to handle setup and players session hydration
        if (action === ACTION.start && isRecord(session.players)) {
            session.status = STATUS.started;
            session.availableSlots = [];
            session.players = setupService.assignTurnOrder(cc(session.players))
            session.players = passActiveStatus(cc(session.players));
            session.setup = setupService.determineBoardPieces();
            localSession.moveRules = setupService.filterAllowedMoves(
                cc(DEFAULT_MOVE_RULES),
                cc(BARRIER_CHECKS),
                cc(session.setup.barriers)
            );
            session.players = setupService.hydrateMoveRules(
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