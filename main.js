import Konva from 'konva';
import { color, initialHexData } from './config.js';

const HEX_COUNT = 7;

const serverUrl = 'ws://localhost:8080';
let connection = null;

const serverState = {
    locationHex: null,
    allowedMoves: null,
}

const boardState = {
    playerShip: null,
    // opponents: [],
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

    return new Promise((resolve, reject) => {
        let isPromise = true;

        const wss = new WebSocket(serverUrl);

        wss.onopen = () => {
            console.log('Connected to the server');
            setInfo('Your turn');

            wss.send(JSON.stringify({
                action: 'refresh',
                details: null
            }));

        }

        wss.onerror = (error) => {
            console.error('WebSocket connection error:', error);

            reject(error);
        }

        wss.onmessage = (event) => {

            console.log('Received ', event.data);
            const data = JSON.parse(event.data);

            if (data.error) {
                setInfo(data.error);
                return;
            }

            saveValues(data, serverState);

            if (isPromise) {
                isPromise = false;

                resolve(wss);
            }
        }
    });
}

const setInfo = (text) => {
    const info = document.getElementById('info');
    info.innerHTML = text;
}

const newMapHex = (name, x, y, fill) => {
    return new Konva.RegularPolygon({
        x: stage.width() / 2,
        y: stage.width() / 2,
        offsetX: x,
        offsetY: y,
        sides: 6,
        radius: 100,
        fill: fill,
        stroke: 'black',
        strokeWidth: 1,
        id: name,
    });
}

const createPlayerShip = (x, y) => {

    const ship = new Konva.Rect({
        x: stage.width() / 2,
        y: stage.height() / 2,
        offsetX: x,
        offsetY: y,
        fill: color.playerRed,
        stroke: 'black',
        strokeWidth: 3,
        width: 40,
        height: 30,
        cornerRadius: [0, 0, 5, 30],
        draggable: true,
        id: 'ship',
    });

    let homePosition = null;

    ship.on('dragstart', () => {
        homePosition = { x: ship.x(), y: ship.y() };
    });

    let hoverStatus = null;

    ship.on('dragmove', () => {
        for (let i = 0; i < HEX_COUNT; i++) {
            const hex = boardState.mapHexes[i];
            hex.fill(hex.attrs.id == serverState.locationHex ? color.currentHex : color.default);
        }

        const targetHex = boardState.mapHexes.find(hex => isPointerOver(hex));

        if (!targetHex) {
            return
        }

        switch (true) {
            case targetHex.attrs.id == serverState.locationHex:
                hoverStatus = 'home';
                break;
            case serverState.allowedMoves.includes(targetHex.attrs.id):
                hoverStatus = 'valid';
                targetHex.fill(color.valid);
                break;
            default:
                hoverStatus = 'illegal';
                targetHex.fill(color.illegal);
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
            boardState.mapHexes[i].fill(color.default);
        }

        switch (hoverStatus) {
            case 'home':
            case 'illegal':
                boardState.mapHexes.find(hex => hex.attrs.id == serverState.locationHex).fill(color.currentHex);
                ship.x(homePosition.x);
                ship.y(homePosition.y);
                break;
            case 'valid':
                const hex = boardState.mapHexes.find(hex => isPointerOver(hex));
                hex.fill(color.currentHex);
                connection.send(JSON.stringify({
                    action: 'move',
                    details: hex.attrs.id
                }));
        }

        layer.batchDraw();
    });

    return ship;
};

const drawBoard = () => {
    initialHexData.forEach(item => {
        const hex = newMapHex(
            item.name,
            item.x,
            item.y,
            serverState.locationHex == item.name ? color.currentHex : color.default
        );
        boardState.mapHexes.push(hex);
        layer.add(hex);
    });
    const currentHexInitialData = initialHexData.find(item => item.name == serverState.locationHex);
    boardState.playerShip = createPlayerShip(currentHexInitialData.x, currentHexInitialData.y);
    layer.add(boardState.playerShip);
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
    createConnection().then((wsObject) => {
        document.getElementById('joinButton').disabled = true;
        connection = wsObject;
        drawBoard();
    });
});