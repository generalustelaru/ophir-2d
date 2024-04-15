import Konva from 'konva';

const serverUrl = 'ws://localhost:8080';
const connection = new WebSocket(serverUrl);

const color = {
    playerRed: '#ff0000',
    illegal: '#e60049',
    valid: '#50e991',
    default: '#b3d4ff',
    currentHex: '#0bb4ff',
}
connection.onopen = () => {
    console.log('Connected to the server');
    setInfo('Your turn');
    connection.send(JSON.stringify({
        action: 'refresh',
        details: null
    }));
};

let state = {
    locationHex: null,
    allowedMoves: null,
};
let homePosition = null;
let hoverStatus = null;

connection.onmessage = (event) => {
    console.log('Received ', event.data);
    const data = JSON.parse(event.data);
    if (data.error) {
        setInfo(data.error);
        return;
    }
    state = data;
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

const newShip = (x, y) => {
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
    ship.on('dragstart', () => {
        homePosition = { x: ship.x(), y: ship.y() };
    });

    ship.on('dragmove', () => {
        for (let i = 0; i < 7; i++) {
            const hex = mapHexes[i];
            hex.fill(hex.attrs.id == state.locationHex ? color.currentHex : color.default);
        }

        const targetHex = mapHexes.find(hex => isPointerOver(hex));


        switch (true) {
            case targetHex.attrs.id == state.locationHex:
                hoverStatus = 'home';
                break;
            case state.allowedMoves.includes(targetHex.attrs.id):
                hoverStatus = 'valid';
                targetHex.fill(color.valid);
                break;
            default:
                hoverStatus = 'illegal';
                targetHex.fill(color.illegal);
        }
    });

    ship.on('dragend', () => {

        for (let i = 0; i < 7; i++) {
            mapHexes[i].fill(color.default);
        }

        switch (hoverStatus) {
            case 'home':
            case 'illegal':
                mapHexes.find(hex => hex.attrs.id == state.locationHex).fill(color.currentHex);
                ship.x(homePosition.x);
                ship.y(homePosition.y);
                break;
            case 'valid':
                const hex = mapHexes.find(hex => isPointerOver(hex));
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

const initialHexData = [
    { name: 'center', x: 0, y: 0 },
    { name: 'topLeft', x: 86, y: 150 },
    { name: 'bottomRight', x: -86, y: -150 },
    { name: 'topRight', x: -86, y: 150 },
    { name: 'bottomLeft', x: 86, y: -150 },
    { name: 'left', x: 172, y: 0 },
    { name: 'right', x: -172, y: 0 },
];
const mapHexes = [];
let ship = null;

window.setTimeout(() => {
    initialHexData.forEach(item => {
        const hex = newMapHex(
            item.name,
            item.x,
            item.y,
            state.locationHex == item.name ? color.currentHex : color.default
        );
        mapHexes.push(hex);
        layer.add(hex);
    });
    const currentHexInitialData = initialHexData.find(item => item.name == state.locationHex);
    ship = newShip(currentHexInitialData.x, currentHexInitialData.y);
    layer.add(ship);
}, 1000);

const isPointerOver = (mapElement) => {

    return mapElement.intersects(stage.getPointerPosition());
}
stage.add(layer);
layer.draw();