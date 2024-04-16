import Konva from 'konva';
import { color, initialHexData } from './config.js';

const serverUrl = 'ws://localhost:8080';
const connection = new WebSocket(serverUrl);

connection.onopen = () => {
    console.log('Connected to the server');
    setInfo('Your turn');
    connection.send(JSON.stringify({
        action: 'refresh',
        details: null
    }));
};

const serverState = {
    locationHex: null,
    allowedMoves: null,
};

const board = {
    playerShip: null,
    // opponents: [],
    mapHexes: []
}

connection.onmessage = (event) => {
    console.log('Received ', event.data);
    const data = JSON.parse(event.data);
    if (data.error) {
        setInfo(data.error);
        return;
    }
    saveValues(data, serverState);
};

const info = document.getElementById('info');
const setInfo = (text) => {
    info.innerHTML = text;
}
var stage = new Konva.Stage({
    container: 'container',
    visible: true,
    opacity: 1,
    width: 500,
    height: 500,
});
var layer = new Konva.Layer();

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
        for (let i = 0; i < 7; i++) {
            const hex = board.mapHexes[i];
            hex.fill(hex.attrs.id == serverState.locationHex ? color.currentHex : color.default);
        }

        const targetHex = board.mapHexes.find(hex => isPointerOver(hex));

        if(!targetHex) {
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

        const targetHex = board.mapHexes.find(hex => isPointerOver(hex));

        if(!targetHex) {
            ship.x(homePosition.x);
            ship.y(homePosition.y);
            layer.batchDraw();

            return
        }

        for (let i = 0; i < 7; i++) {
            board.mapHexes[i].fill(color.default);
        }

        switch (hoverStatus) {
            case 'home':
            case 'illegal':
                board.mapHexes.find(hex => hex.attrs.id == serverState.locationHex).fill(color.currentHex);
                ship.x(homePosition.x);
                ship.y(homePosition.y);
                break;
            case 'valid':
                const hex = board.mapHexes.find(hex => isPointerOver(hex));
                hex.fill(color.currentHex);
                connection.send(JSON.stringify({
                    action: 'move',
                    details: hex.attrs.id
                })
                );
        }

        layer.batchDraw();
    });

    return ship;
};



window.setTimeout(() => {
    initialHexData.forEach(item => {
        const hex = newMapHex(
            item.name,
            item.x,
            item.y,
            serverState.locationHex == item.name ? color.currentHex : color.default
        );
        board.mapHexes.push(hex);
        layer.add(hex);
    });
    const currentHexInitialData = initialHexData.find(item => item.name == serverState.locationHex);
    board.playerShip = createPlayerShip(currentHexInitialData.x, currentHexInitialData.y);
    layer.add(board.playerShip);
}, 1000);

const isPointerOver = (mapElement) => {

    return mapElement.intersects(stage.getPointerPosition());
}

const saveValues = (source, destination) => {
    Object.keys(source).forEach(key => {
        destination[key] = source[key];
    })
}
stage.add(layer);
layer.draw();