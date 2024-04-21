import Konva from 'konva';
import { colors, hexData } from './config.js';
import { MapHex } from './elements/MapHex.js';

const HEX_COUNT = 7;

const serverUrl = 'ws://localhost:8080';
let connection = null;
let playerId = null;

const serverState = {
    hasStarted: null,
    playerWhite: null,
    playerYellow: null,
    playerRed: null,
    playerGreen: null,
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

const createConnection = () => {
    playerId = document.getElementById('playerColorSelect').value;

    if (!playerId) {
        throw new Error('Please select a color');
    }

    return new Promise((resolve, reject) => {
        let isPromise = true;

        const wss = new WebSocket(serverUrl);

        //TODO: should move object composition from here
        wss.onopen = () => {
            console.log('Connected to the server');
            setInfo('Your turn');

            wss.send(JSON.stringify({
                playerId,
                action: 'refresh',
                details: null,
            }));

        }

        wss.onerror = (error) => {
            console.error('WebSocket connection error:', error);

            reject(error);
        }

        wss.onmessage = (event) => {

            console.debug('Received ', event.data);
            const data = JSON.parse(event.data);

            if (data.error) {
                setInfo(data.error);
                return;
            }

            saveValues(data, serverState);

            if (isPromise) {
                isPromise = false;

                resolve(wss);
            } else {
                updateBoard();
            }
        }
    });
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
        for (let i = 0; i < HEX_COUNT; i++) {
            const hex = boardState.mapHexes[i];
            hex.fill(hex.attrs.id == serverState[playerId].locationHex ? colors.currentHex : colors.default);
        }

        const targetHex = boardState.mapHexes.find(hex => isPointerOver(hex));

        if (!targetHex) {
            return
        }

        switch (true) {
            case targetHex.attrs.id == serverState[playerId].locationHex:
                hoverStatus = 'home';
                break;
            case serverState[playerId].allowedMoves.includes(targetHex.attrs.id):
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
                boardState.mapHexes.find(hex => hex.attrs.id == serverState[playerId].locationHex).fill(colors.currentHex);
                ship.x(homePosition.x);
                ship.y(homePosition.y);
                break;
            case 'valid':
                const hex = boardState.mapHexes.find(hex => isPointerOver(hex));
                hex.fill(colors.currentHex);
                connection.send(JSON.stringify({
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
    hexData.forEach(hexItem => {
        const hexElement = new MapHex(
            stage.width(),
            hexItem.id,
            hexItem.x,
            hexItem.y,
            serverState[playerId].locationHex == hexItem.id ? colors.currentHex : colors.default
        );
        boardState.mapHexes.push(hexElement);
        layer.add(hexElement);
    });

    for (const opponentId in serverState) {
        if (serverState[opponentId] && opponentId != playerId) {
            const locationData = hexData.find(hexItem => hexItem.id == serverState[opponentId].locationHex);
            const ship = createOpponentShip(locationData.x, locationData.y, colors[opponentId], opponentId);
            boardState.opponentShips.push(ship);
            layer.add(ship);
        }
    }

    const locationData = hexData.find(hexItem => hexItem.id == serverState[playerId].locationHex);
    boardState.playerShip = createPlayerShip(locationData.x, locationData.y, colors[playerId]);
    layer.add(boardState.playerShip);

}

const updateBoard = () => {

    boardState.opponentShips.forEach(ship => {
        const opponentId = ship.attrs.id;

        if (serverState[opponentId]) {
            const locationData = hexData.find(hexItem => hexItem.id == serverState[opponentId].locationHex);
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

document.getElementById('joinButton').addEventListener('click', () => {

    try {
        createConnection().then((wsObject) => {
            document.getElementById('joinButton').disabled = true;
            document.getElementById('playerColorSelect').disabled = true;
            connection = wsObject;
            drawBoard();
        });
    } catch (error) {
        setInfo(error);
    }
});