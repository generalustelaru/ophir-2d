import Konva from 'konva';
import { colors, hexData } from './config.js';
import { MapHex } from './elements/MapHex.js';

const HEX_COUNT = 7;

const serverUrl = 'ws://localhost:8080';
let playerId = null;
let isBoardDrawn = false;

const serverState = {
    hasStarted: null,
    sessionOwner: null,
    players: {
        playerWhite: null,
        playerYellow: null,
        playerRed: null,
        playerGreen: null,
    },
}

const boardState = {
    playerShip: null,
    opponentShips: [],
    mapHexes: [],
}

const stage = new Konva.Stage({
    container: 'container',
    visible: true,
    opacity: 1,
    width: 500,
    height: 500,
});

const layer = new Konva.Layer();
stage.add(layer);
layer.draw();

const wss = new WebSocket(serverUrl);

wss.onopen = () => {
    setInfo('Connected to the server');

    wss.send(JSON.stringify({
        playerId,
        action: 'inquire',
        details: null,
    }))
}

wss.onerror = (error) => {
    console.error('WebSocket connection error:', error);
}

wss.onmessage = (event) => {
    console.debug('Received ', event.data);
    const data = JSON.parse(event.data);

    if (data.error) {
        setInfo(data.error);
        return;
    }

    saveValues(data, serverState);

    if (serverState.hasStarted) {
        setInfo('The \'game\' has started');
        if (isBoardDrawn) {
            updateBoard();
        } else {
            drawBoard();
            isBoardDrawn = true;
        }
    } else {
        updatePreSessionUi();
    }
}

const createSession = () => {
    playerId = document.getElementById('playerColorSelect').value;

    if (!playerId) {
        throw new Error('Please select a color');
    }

    wss.send(JSON.stringify({
        playerId,
        action: 'refresh',
        details: null,
    }));
}

const syncWithSession = () => {
    playerId = document.getElementById('playerColorSelect').value;

    if (!playerId) {
        throw new Error('Please select a color');
    }
    wss.send(JSON.stringify({
        playerId,
        action: 'refresh',
        details: null,
    }));
}
const setInfo = (text) => {
    const info = document.getElementById('info');
    info.innerHTML = text;
}

const createOpponentShip = (x, y, color, opponentColor) => {

    const ship = new Konva.Rect({
        x: stage.width() / 2,
        y: stage.height() / 2,
        offsetX: x,
        offsetY: y,
        fill: color,
        stroke: 'black',
        strokeWidth: 3,
        width: 40,
        height: 30,
        cornerRadius: [0, 0, 5, 30],
        draggable: false,
        id: opponentColor,
    });

    return ship;
}

const createPlayerShip = (x, y, color) => {

    const ship = new Konva.Rect({
        x: stage.width() / 2,
        y: stage.height() / 2,
        offsetX: x,
        offsetY: y,
        fill: color,
        stroke: 'black',
        strokeWidth: 3,
        width: 40,
        height: 30,
        cornerRadius: [0, 0, 5, 30],
        draggable: true,
        id: 'playerShip',
    });

    let homePosition = null;

    ship.on('dragstart', () => {
        homePosition = { x: ship.x(), y: ship.y() };
    });

    let hoverStatus = null;

    ship.on('dragmove', () => {

        const players = serverState.players;
        
        for (let i = 0; i < HEX_COUNT; i++) {
            const hex = boardState.mapHexes[i];
            hex.fill(hex.attrs.id == players[playerId].locationHex ? colors.currentHex : colors.default);
        }

        const targetHex = boardState.mapHexes.find(hex => isPointerOver(hex));

        if (!targetHex) {
            return
        }

        switch (true) {
            case players[playerId].locationHex == targetHex.attrs.id:
                hoverStatus = 'home';
                break;
            case players[playerId].allowedMoves.includes(targetHex.attrs.id):
                hoverStatus = 'valid';
                targetHex.fill(colors.valid);
                break;
            default:
                hoverStatus = 'illegal';
                targetHex.fill(colors.illegal);
        }
    });

    ship.on('dragend', () => {

        const targetHex = boardState.mapHexes.find(hex => isPointerOver(hex));

        if (!targetHex) {
            ship.x(homePosition.x);
            ship.y(homePosition.y);
            layer.batchDraw();

            return
        }

        for (let i = 0; i < HEX_COUNT; i++) {
            boardState.mapHexes[i].fill(colors.default);
        }

        switch (hoverStatus) {
            case 'home':
            case 'illegal':
                boardState.mapHexes.find(hex => hex.attrs.id == serverState.players[playerId].locationHex).fill(colors.currentHex);
                ship.x(homePosition.x);
                ship.y(homePosition.y);
                break;
            case 'valid':
                const hex = boardState.mapHexes.find(hex => isPointerOver(hex));
                hex.fill(colors.currentHex);
                wss.send(JSON.stringify({
                    playerId,
                    action: 'move',
                    details: {
                        hex: hex.attrs.id
                    }
                }));
        }

        layer.batchDraw();
    });

    return ship;
};

const drawBoard = () => {

    const players = serverState.players;
    hexData.forEach(hexItem => {
        const hexElement = new MapHex(
            stage.width(),
            hexItem.id,
            hexItem.x,
            hexItem.y,
            players[playerId].locationHex == hexItem.id ? colors.currentHex : colors.default
        );
        boardState.mapHexes.push(hexElement);
        layer.add(hexElement);
    });

    for (const opponentId in players) {
        if (players[opponentId] && opponentId != playerId) {
            console.log(opponentId);
            const locationData = hexData.find(hexItem => hexItem.id == players[opponentId].locationHex);
            const ship = createOpponentShip(locationData.x, locationData.y, colors[opponentId], opponentId);
            boardState.opponentShips.push(ship);
            layer.add(ship);
        }
    }

    const locationData = hexData.find(hexItem => hexItem.id == players[playerId].locationHex);
    boardState.playerShip = createPlayerShip(locationData.x, locationData.y, colors[playerId]);
    layer.add(boardState.playerShip);

}

const updateBoard = () => {

    boardState.opponentShips.forEach(ship => {
        const opponentId = ship.attrs.id;
        const players = serverState.players;

        if (players[opponentId]) {
            const locationData = hexData.find(hexItem => hexItem.id == players[opponentId].locationHex);
            ship.offsetX(locationData.x);
            ship.offsetY(locationData.y);

            layer.batchDraw();
        } else {
            setInfo(`${opponentId} has left the game`);
            ship.destroy();
        }
    });

}

const isPointerOver = (mapElement) => {

    return mapElement.intersects(stage.getPointerPosition());
}

const saveValues = (source, destination) => {
    Object.keys(source).forEach(key => {
        destination[key] = source[key];
    })
}

const updatePreSessionUi = () => {
    const { playerWhite, playerYellow, playerRed, playerGreen } = serverState.players;
    const players = [playerWhite, playerYellow, playerRed, playerGreen];

    if (players.every(state => state == null)) {
        document.getElementById('createButton').disabled = false;
        setInfo('You may create the game');
    } else if (playerId) {
        document.getElementById('createButton').disabled = true;
        document.getElementById('joinButton').disabled = true;
        document.getElementById('playerColorSelect').disabled = true;
        setInfo('Waiting for players to join...');
    } else if (players.includes(null)) {
        document.getElementById('createButton').disabled = true;
        document.getElementById('joinButton').disabled = false;
        setInfo('A game is waiting for you');
    }

    if (playerId && playerId == serverState.sessionOwner) {
        document.getElementById('startButton').disabled = false;
    }
}

document.getElementById('createButton').addEventListener('click', () => {
    try {
        createSession();
    } catch (error) {
        setInfo(error);
    }
    // document.getElementById('createButton').disabled = true;
});
document.getElementById('joinButton').addEventListener('click', () => {
    try {
        syncWithSession();
        // document.getElementById('joinButton').disabled = true;
        // document.getElementById('playerColorSelect').disabled = true;
    } catch (error) {
        setInfo(error);
    }
});
document.getElementById('startButton').addEventListener('click', () => {
    wss.send(JSON.stringify({
        playerId,
        action: 'start',
        details: null,
    }));
    document.getElementById('startButton').disabled = true;
});