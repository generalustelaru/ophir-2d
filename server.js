import express from 'express';
import { WebSocketServer } from 'ws';
import constants from './src/constants.json' assert { type: "json" };
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

const MOVE_RULES = [
    { from: 'center', allowed: ['topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft'] },
    { from: 'topRight', allowed: ['center', 'right', 'topLeft'] },
    { from: 'right', allowed: ['center', 'topRight', 'bottomRight'] },
    { from: 'bottomRight', allowed: ['center', 'right', 'bottomLeft'] },
    { from: 'bottomLeft', allowed: ['center', 'left', 'bottomRight'] },
    { from: 'left', allowed: ['center', 'topLeft', 'bottomLeft'] },
    { from: 'topLeft', allowed: ['center', 'left', 'topRight'] },
]
const PLAYER_IDS = [
    'playerWhite',
    'playerYellow',
    'playerRed',
    'playerGreen',
];

const PLAYER_STATE = {
    location: 'right',
    allowedMoves: ['center', 'topRight', 'bottomRight'],
};

const session = {
    status: STATUS.empty,
    sessionOwner: null,
    availableSlots: [...PLAYER_IDS],
    players: {
        playerWhite: null,
        playerYellow: null,
        playerRed: null,
        playerGreen: null,
    },
}

app.get('/', (res) => {
    res.sendFile(__dirname + '../public/index.html');
});

app.listen(httpPort, () => {
    console.info(`Server running at http://localhost:${httpPort}`);
});

const socketClients = [];
const socketServer = new WebSocketServer({ port: wsPort });

socketServer.on(WS_SIGNAL.connection, function connection(ws) {

    socketClients.push(ws);
    console.log('New client connection or page refresh');
    const sendAll = (message) => {
        socketClients.forEach(client => {
            client.send(JSON.stringify(message));
        });
    }

    const send = (message) => {
        ws.send(JSON.stringify(message));
    }

    ws.on(WS_SIGNAL.message, function incoming(message) {
        try {
            const { playerId, action, details } = JSON.parse(message);
            console.info(
                '%s -> %s %s',
                playerId ?? '?',
                getKey(ACTION, action) ?? '?',
                details ?? ''
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
                    send({ error: 'Cannot enroll' });
                }
            }

            if (action == ACTION.start) {
                session.status = STATUS.started;
                session.availableSlots = [];
                sendAll(session);
            }

            if (action == ACTION.move) {
                const destination = details.hex;
                const allowed = MOVE_RULES.find(rule => rule.from == player.location).allowed;

                if (allowed.includes(destination)) {
                    player.location = destination;
                    player.allowedMoves = MOVE_RULES.find(rule => rule.from == destination).allowed;

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

function processPlayer(playerId) {

    if (session.status == STATUS.started || session.status == STATUS.full) {
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

    if (session.sessionOwner == null) {
        session.status = STATUS.lobby;
        session.sessionOwner = playerId;
        console.log(`${playerId} is the session owner`);
    }

    if (session.availableSlots.length == 0) {
        session.status = STATUS.full;
        console.log(`Session is full`);
    }

    return true;
}

function getKey(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}