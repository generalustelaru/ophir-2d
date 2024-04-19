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

const state = {
    locationHex: 'center',
    allowedMoves: ['topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft']
};

app.get('/', (res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(httpPort, () => {
    console.info(`Server running at http://localhost:${httpPort}`);
});

const socketServer = new WebSocketServer({ port: wsPort });

socketServer.on('connection', function connection(ws) {

    ws.on('message', function incoming(message) {
        try {
            const messageObject = JSON.parse(message);
            console.log('received: %s: %s', messageObject.action, messageObject.details);

            if (messageObject.action == 'refresh') {
                ws.send(JSON.stringify(state));
            }

            if (messageObject.action == 'move') {
                const allowed = moveRules.find(rule => rule.from == state.locationHex).allowed;

                if (allowed.includes(messageObject.details)) {
                    state.locationHex = messageObject.details;
                    state.allowedMoves = moveRules.find(rule => rule.from == messageObject.details).allowed;

                    ws.send(JSON.stringify(state));
                } else {

                    ws.send(JSON.stringify({ error: 'illegal move!' }));
                }
            }
        } catch (error) {
            console.log(error.message);
            console.log(`original message: ${message}`);
        }
    });
});