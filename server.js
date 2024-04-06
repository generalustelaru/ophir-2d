const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public')); // Serve static files from the 'public' directory

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
        } catch (error) {
            console.log(error.message, `message: ${message}`);
        }
    });

    ws.send('Welcome to the WebSocket server!');
});