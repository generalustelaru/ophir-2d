const serverUrl = 'ws://localhost:8080';
const connection = new WebSocket(serverUrl);

connection.onopen = () => {
    console.log('Connected to the server');
    connection.send('Player connected');
};

connection.onmessage = (event) => {
    console.log('Message from server ', event.data);
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

var center = new Konva.Star({
    x: stage.width() / 2,
    y: stage.height() / 2,
    numPoints: 3,
    innerRadius: 100,
    outerRadius: 100,
    fill: 'lightblue',
    stroke: 'black',
    strokeWidth: 1,
    closed: true,
    id: 'center',
}); layer.add(center);
var topLeft = new Konva.Star({
    x: stage.width() / 2,
    y: stage.height() / 2,
    numPoints: 3,
    innerRadius: 100,
    outerRadius: 100,
    fill: '#00D2FF',
    stroke: 'black',
    strokeWidth: 1,
    closed: true,
    offsetX: 86,
    offsetY: 150,
    id: 'topLeft',
}); layer.add(topLeft);
var bottomRight = new Konva.Star({
    x: stage.width() / 2,
    y: stage.height() / 2,
    numPoints: 3,
    innerRadius: 100,
    outerRadius: 100,
    fill: '#00D2FF',
    stroke: 'black',
    strokeWidth: 1,
    closed: true,
    offsetX: -86,
    offsetY: -150,
    id: 'bottomRight',
}); layer.add(bottomRight);
var topRight = new Konva.Star({
    x: stage.width() / 2,
    y: stage.height() / 2,
    numPoints: 3,
    innerRadius: 100,
    outerRadius: 100,
    fill: '#00D2FF',
    stroke: 'black',
    strokeWidth: 1,
    closed: true,
    offsetX: -86,
    offsetY: 150,
    id: 'topRight',
}); layer.add(topRight);
var bottomLeft = new Konva.Star({
    x: stage.width() / 2,
    y: stage.height() / 2,
    numPoints: 3,
    innerRadius: 100,
    outerRadius: 100,
    fill: '#00D2FF',
    stroke: 'black',
    strokeWidth: 1,
    closed: true,
    offsetX: 86,
    offsetY: -150,
    id: 'bottomLeft',
}); layer.add(bottomLeft);
var left = new Konva.Star({
    x: stage.width() / 2,
    y: stage.height() / 2,
    numPoints: 3,
    innerRadius: 100,
    outerRadius: 100,
    fill: '#00D2FF',
    stroke: 'black',
    strokeWidth: 1,
    closed: true,
    offsetX: 172,
    offsetY: 0,
    id: 'left',
}); layer.add(left);
var right = new Konva.Star({
    x: stage.width() / 2,
    y: stage.height() / 2,
    numPoints: 3,
    innerRadius: 100,
    outerRadius: 100,
    fill: '#00D2FF',
    stroke: 'black',
    strokeWidth: 1,
    closed: true,
    offsetX: -172,
    offsetY: 0,
    id: 'right',
}); layer.add(right);


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

        if (layer.children[i].attrs.id !== 'ship' && haveIntersection(ship.getClientRect(), layer.children[i].getClientRect())) {

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
        if (layer.children[i].attrs.id !== 'ship' && haveIntersection(ship.getClientRect(), layer.children[i].getClientRect())) {
            layer.children[i].fill('lightblue');
            connection.send('Player in hex ' + layer.children[i].attrs.id);
            break;
        }
    }
});

function haveIntersection(r1, r2) {
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