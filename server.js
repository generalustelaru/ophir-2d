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
const PLAYER_COLORS = [
    'playerWhite',
    'playerYellow',
    'playerRed',
    'playerGreen',
];

const ACTIONS = {
    refresh: 'refresh',
    move: 'move',
}

const STARTING_PLAYER_STATE = {
    locationHex: 'center',
    allowedMoves: ['topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft']
};

const state = { //TODO: turn into a service class and detach from the server
    playerRed: null,
    playerBlue: null,
    playerGreen: null,
    playerWhite: null,
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

    const send = (client, message) => {
        ws.send(JSON.stringify(message));
    }

    ws.on('message', function incoming(message) {
        try {
            const { playerColor, action, details } = JSON.parse(message);
            console.info('%s: %s %s', playerColor, action, details);

            const playerState = state[playerColor];

            if (action == ACTIONS.refresh) {

                if (state[playerColor] == null) {
                    addNewPlayer(playerColor);
                }

                sendAll(state);
            }

            if (action == ACTIONS.move) {
                const destination = details.hex;
                const allowed = MOVE_RULES.find(rule => rule.from == playerState.locationHex).allowed;

                if (allowed.includes(destination)) {
                    playerState.locationHex = destination;
                    playerState.allowedMoves = MOVE_RULES.find(rule => rule.from == destination).allowed;

                    sendAll(state);
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

function addNewPlayer(playerColor) {

    if (PLAYER_COLORS.includes(playerColor)) {
        console.log(`${playerColor} connected`);
    }

    state[playerColor] = { ...STARTING_PLAYER_STATE };
}