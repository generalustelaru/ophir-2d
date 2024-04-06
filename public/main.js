const serverUrl = 'ws://localhost:8080';
const connection = new WebSocket(serverUrl);

connection.onopen = () => {
    console.log('Connected to the server');
    connection.send(JSON.stringify({
        action: 'Player connected',
        details: 'Player 1'})
    );
};

connection.onmessage = (event) => {
    console.log('Received ', event.data);
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

const getMapHex = (name, x, y, fill) => {
    return new Konva.Star({
        x: stage.width() / 2,
        y: stage.width() / 2,
        offsetX: x,
        offsetY: y,
        numPoints: 3,
        innerRadius: 100,
        outerRadius: 100,
        fill: fill,
        stroke: 'black',
        strokeWidth: 1,
        closed: true,
        id: name,
    });
}

const mapHexes = [
    { name: 'center', x: 0, y: 0, fill: 'lightblue' },
    { name: 'topLeft', x: 86, y: 150, fill: '#00D2FF' },
    { name: 'bottomRight', x: -86, y: -150, fill: '#00D2FF' },
    { name: 'topRight', x: -86, y: 150, fill: '#00D2FF' },
    { name: 'bottomLeft', x: 86, y: -150, fill: '#00D2FF' },
    { name: 'left', x: 172, y: 0, fill: '#00D2FF' },
    { name: 'right', x: -172, y: 0, fill: '#00D2FF' },
];
mapHexes.forEach(hex => {
    layer.add(getMapHex(hex.name, hex.x, hex.y, hex.fill));
});

var ship = new Konva.Rect({
    x: stage.width() / 2,
    y: stage.height() / 2,
    fill: 'red',
    stroke: 'black',
    strokeWidth: 4,
    width: 40,
    height: 30,
    cornerRadius: [0, 0, 5, 30],
    draggable: true,
    id: 'ship',
}); layer.add(ship);
ship.on('dragstart', function () {

    layer.children.forEach(child => {

        if (child.attrs.id !== 'ship') {
            child.fill('#00D2FF');
        }
    });
});
ship.on('dragmove', function () {
    const childrenCount = layer.children.length;

    for (let i = 0; i < childrenCount; i++) {

        if (layer.children[i].attrs.id !== 'ship' && isIntersection(ship.getClientRect(), layer.children[i].getClientRect())) {

            for (let j = 0; j < childrenCount; j++) {

                if (layer.children[j].attrs.id !== 'ship') {
                    layer.children[j].fill('#00D2FF');
                }
            }
            layer.children[i].fill('lightgreen');
            break;
        }
    }
});
ship.on('dragend', function () {
    const childrenCount = layer.children.length;

    for (let i = 0; i < childrenCount; i++) {

        if (layer.children[i].attrs.id !== 'ship' && isIntersection(ship.getClientRect(), layer.children[i].getClientRect())) {
            layer.children[i].fill('lightblue');
            connection.send(JSON.stringify({
                action: 'move',
                details: layer.children[i].attrs.id})
            );
            break;
        }
    }
});

const isIntersection = (r1, r2) => {
    return !(
        r2.x > r1.x + r1.width ||
        r2.x + r2.width < r1.x ||
        r2.y > r1.y + r1.height ||
        r2.y + r2.height < r1.y
    );
}

// add the layer to the stage
stage.add(layer);
// draw the layer
layer.draw();