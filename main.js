import Konva from 'konva';

const serverUrl = 'ws://localhost:8080';
const connection = new WebSocket(serverUrl);

const color = {
    playerRed: 'red',
    illegal: '#e60049',
    valid: '#50e991',
    mapHex: '#b3d4ff',
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
let canMove = true;
let currentPosition = null;

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
// stage is the master container
var stage = new Konva.Stage({
    container: 'container',
    visible: true,
    opacity: 1,
    width: 500,
    height: 500,
});

// layer is a container for shapes; we can have multiple layers in a stage
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

const mapHexes = [
    { name: 'center', x: 0, y: 0, fill: color.currentHex },
    { name: 'topLeft', x: 86, y: 150, fill: color.mapHex },
    { name: 'bottomRight', x: -86, y: -150, fill: color.mapHex },
    { name: 'topRight', x: -86, y: 150, fill: color.mapHex },
    { name: 'bottomLeft', x: 86, y: -150, fill: color.mapHex },
    { name: 'left', x: 172, y: 0, fill: color.mapHex },
    { name: 'right', x: -172, y: 0, fill: color.mapHex },
];
mapHexes.forEach(hex => {
    layer.add(newMapHex(hex.name, hex.x, hex.y, hex.fill));
});

const ship = new Konva.Rect({
    x: stage.width() / 2,
    y: stage.height() / 2,
    fill: color.playerRed,
    stroke: 'black',
    strokeWidth: 3,
    width: 40,
    height: 30,
    cornerRadius: [0, 0, 5, 30],
    draggable: true,
    id: 'ship',
}); layer.add(ship);

ship.on('dragstart', () => {
    currentPosition = { x: ship.x(), y: ship.y() };
});

ship.on('dragmove', () => {
    const count = layer.children.length;

    for (let i = 0; i < count; i++) {

        if (layer.children[i].attrs.id == 'ship') continue;

        const mapElement = layer.children[i];
        if (isPointerOver(mapElement)) {

            for (let j = 0; j < count; j++) {

                if (layer.children[j].attrs.id !== 'ship') {

                    if (!state.allowedMoves.includes(layer.children[j].attrs.id)) {
                        layer.children[j].fill(color.illegal);
                    } else {
                        layer.children[j].fill(color.mapHex);
                    }
                }
            }

            if (state.allowedMoves.includes(mapElement.attrs.id)) {
                mapElement.fill(color.valid);
                canMove = true;
            } else {
                mapElement.fill(color.illegal);
                canMove = false;
            }
            break;
        }
    }
});

ship.on('dragend', function () {
    const count = layer.children.length;

    for (let i = 0; i < count; i++) {

        if (layer.children[i].attrs.id == 'ship') continue;

        if (isPointerOver(layer.children[i])) {

            if(canMove) {
                layer.children[i].fill(color.currentHex);
                connection.send(JSON.stringify({
                    action: 'move',
                    details: layer.children[i].attrs.id})
                );
                setInfo('Your turn');
            } else {
                ship.x(currentPosition.x);
                ship.y(currentPosition.y);
                layer.batchDraw();
                setInfo('Your turn; <b>Illegal move!</b>');
            }

        } else {
            layer.children[i].fill(color.mapHex);
        }
    }
});

const isPointerOver = (mapElement) => {

    return mapElement.intersects(stage.getPointerPosition());
}

// add the layer to the stage
stage.add(layer);
// draw the layer
layer.draw();