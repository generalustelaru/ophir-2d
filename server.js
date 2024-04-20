import express from 'express';
import { WebSocketServer } from 'ws';
const app = express();
const httpPort = 3000;
const wsPort = 8080;

app.use(express.static('public'));

const moveRules = [
    { from: 'center', allowed: [ 'topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft'] },
    { from: 'topRight', allowed: [ 'center', 'right', 'topLeft'] },
    { from: 'right', allowed: [ 'center', 'topRight', 'bottomRight'] },
    { from: 'bottomRight', allowed: [ 'center', 'right', 'bottomLeft'] },
    { from: 'bottomLeft', allowed: [ 'center', 'left', 'bottomRight'] },
    { from: 'left', allowed: [ 'center', 'topLeft', 'bottomLeft'] },
    { from: 'topLeft', allowed: [ 'center', 'left', 'topRight'] },
]
const playerColors = ['playerRed', 'playerBlue', 'playerGreen', 'playerWhite'];

const defaultPlayerState = {
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
            const messageObject = JSON.parse(message);
            console.info('%s: %s %s', messageObject.playerColor, messageObject.action, messageObject.details);

            const sender = messageObject.playerColor;
            const playerState = state[sender];

            if (messageObject.action == 'refresh') {

                if (state[sender] == null) {
                    addNewPlayer(sender);
                }

                sendAll(state);
            }

            if (messageObject.action == 'move') {
                const destination = messageObject.details.hex;
                const allowed = moveRules.find(rule => rule.from == playerState.locationHex).allowed;

                if (allowed.includes(destination)) {
                    playerState.locationHex = destination;
                    playerState.allowedMoves = moveRules.find(rule => rule.from == destination).allowed;

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

    if (playerColors.includes(playerColor)) {
        console.log(`${playerColor} connected`);
    }

    state[playerColor] = { ...defaultPlayerState };
}