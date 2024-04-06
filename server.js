const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));

const moveRules = [
    { from: 'center', allowed: ['center', 'topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft'] },
    { from: 'topRight', allowed: ['topRight', 'center', 'right', 'topLeft'] },
    { from: 'right', allowed: ['right', 'center', 'topRight', 'bottomRight'] },
    { from: 'bottomRight', allowed: ['bottomRight', 'center', 'right', 'bottomLeft'] },
    { from: 'bottomLeft', allowed: ['bottomLeft', 'center', 'left', 'bottomRight'] },
    { from: 'left', allowed: ['left', 'center', 'topLeft', 'bottomLeft'] },
    { from: 'topLeft', allowed: ['topLeft', 'center', 'left', 'topRight'] },
]

const state = {
    locationHex: 'center',
    allowedMoves: ['center', 'topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft']
};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {

    ws.on('message', function incoming(message) {
        try {
            messageObject = JSON.parse(message);
            console.log('received: %s: %s', messageObject.action, messageObject.details);

            if (messageObject.action === 'refresh') {
                ws.send(JSON.stringify(state));
            }

            if (messageObject.action === 'move') {
                const allowed = moveRules.find(rule => rule.from === state.locationHex).allowed;

                if (allowed.includes(messageObject.details)) {
                    state.locationHex = messageObject.details;
                    state.allowedMoves = moveRules.find(rule => rule.from === messageObject.details).allowed;

                    ws.send(JSON.stringify(state));
                } else {

                    ws.send(JSON.stringify({ error: 'illegal move!' }));
                }
            }
        } catch (error) {
            console.log(error.message, `message: ${message}`);
        }
    });
});