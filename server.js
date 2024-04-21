import express from 'express';
import { WebSocketServer } from 'ws';
const app = express();
const httpPort = 3000;
const wsPort = 8080;

app.use(express.static('public'));

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

const ACTIONS = {
    inquire: 'inquire',
    refresh: 'refresh',
    start: 'start',
    move: 'move',
}

const STARTING_PLAYER_STATE = {
    locationHex: 'center',
    allowedMoves: ['topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft']
};

const sessionState = { //TODO: turn into a service class and detach from the server
    hasStarted: false,
    sessionOwner: null,
    players: {
        playerWhite: null,
        playerYellow: null,
        playerRed: null,
        playerGreen: null,
    },
}

app.get('/', (res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(httpPort, () => {
    console.info(`Server running at http://localhost:${httpPort}`);
});

const socketClients = [];
const socketServer = new WebSocketServer({ port: wsPort });

socketServer.on('connection', function connection(ws) {

    socketClients.push(ws);

    const sendAll = (message) => {
        socketClients.forEach(client => {
            client.send(JSON.stringify(message));
        });
    }

    const send = (message) => {
        ws.send(JSON.stringify(message));
    }

    ws.on('message', function incoming(message) {
        try {
            const { playerId, action, details } = JSON.parse(message);
            console.info('%s: %s %s', playerId, action, details);

            const playerState = playerId ? sessionState.players[playerId] : null;

            if (action == ACTIONS.inquire) {
                send(sessionState);
            }

            if (action == ACTIONS.refresh) {

                if (false == sessionState.hasStarted && sessionState.players[playerId] == null) {
                    addNewPlayer(playerId);
                }

                if (sessionState.sessionOwner == null) {
                    sessionState.sessionOwner = playerId;
                }

                sendAll(sessionState);
            }

            if (action == ACTIONS.start) {
                sessionState.hasStarted = true;
                sendAll(sessionState);
            }

            if (action == ACTIONS.move) {
                const destination = details.hex;
                const allowed = MOVE_RULES.find(rule => rule.from == playerState.locationHex).allowed;

                if (allowed.includes(destination)) {
                    playerState.locationHex = destination;
                    playerState.allowedMoves = MOVE_RULES.find(rule => rule.from == destination).allowed;

                    sendAll(sessionState);
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

function addNewPlayer(playerId) {

    if (PLAYER_IDS.includes(playerId)) {
        console.log(`${playerId} connected`);
    }

    sessionState.players[playerId] = { ...STARTING_PLAYER_STATE };
}