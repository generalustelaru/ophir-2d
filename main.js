import Konva from 'konva';
import { colors, hexData } from './config.js';
import { MapHex } from './elements/MapHex.js';

const HEX_COUNT = 7;

const STATUS = {
    empty: 'empty',
    lobby: 'lobby',
    full: 'full',
    started: 'started',
}

const serverUrl = 'ws://localhost:8080';
let playerId = null;
let isBoardDrawn = false;
let isSpectator = false;

let serverState = {}

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
    console.error('WebSocket error:', error);
    setInfo('We encoutered a connection error :(');
}

wss.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.dir(data);

    if (data.error) {
        setInfo(data.error);
        return;
    }

    serverState = data;

    if ((serverState.status == STATUS.started && playerId) || isSpectator) {
        if (isBoardDrawn) {
            updateBoard();
        } else {
            setInfo('The \'game\' has started');
            drawBoard();
            isBoardDrawn = true;
        }
    } else {
        updatePreSessionUi();
    }
}

const enroll = () => {
    playerId = document.getElementById('playerColorSelect').value;

    if (!playerId) {
        throw new Error('Please select a color');
    }

    if (serverState.availableSlots.includes(playerId)) {
        wss.send(JSON.stringify({
            playerId,
            action: 'enroll',
            details: null,
        }));
    } else {
        setInfo('This color has just been taken :(');
    }
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
            players[playerId]?.locationHex == hexItem.id ? colors.currentHex : colors.default
        );
        boardState.mapHexes.push(hexElement);
        layer.add(hexElement);
    });

    for (const opponentId in players) {

        if (players[opponentId] && opponentId != playerId) {
            const locationData = hexData.find(hexItem => hexItem.id == players[opponentId].locationHex);
            const ship = createOpponentShip(locationData.x, locationData.y, colors[opponentId], opponentId);
            boardState.opponentShips.push(ship);
            layer.add(ship);
        }
    }

    if (isSpectator) {
        setInfo('You are a spectator');
        return;
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

    const createButton = {
        element: document.getElementById('createButton'),
        enable: () => createButton.element.disabled = false,
        disable: () => createButton.element.disabled = true,
    }

    const joinButton = {
        element: document.getElementById('joinButton'),
        enable: () => joinButton.element.disabled = false,
        disable: () => joinButton.element.disabled = true,
    }

    const playerColorSelect = {
        element: document.getElementById('playerColorSelect'),
        enable: () => {
            playerColorSelect.element.disabled = false;
            playerColorSelect.filter();
        },
        disable: () => playerColorSelect.element.disabled = true,
        filter: () => Array.from(playerColorSelect.element.options).forEach(option => {
            option.disabled = serverState.players[option.value] != null;
        }),
    }

    const startButton = {
        element: document.getElementById('startButton'),
        enable: () => startButton.element.disabled = false,
        disable: () => startButton.element.disabled = true,
    }

    const disableAll = () => {
        createButton.disable();
        joinButton.disable();
        playerColorSelect.disable();
        startButton.disable();
    }

    const setEmpty = () => {
        disableAll();
        createButton.enable();
        playerColorSelect.enable();
        setInfo('You may create the game');
    }

    const setLobby = () => {
        disableAll();

        if (!playerId) {
            joinButton.enable();
            playerColorSelect.enable();
            setInfo('A game is waiting for you');

        } else if (serverState.sessionOwner == playerId) {
            setInfo('You may wait for more player or start');
            startButton.enable();

        } else {
            setInfo('Waiting for players to join...');
        }
    }

    const setFull = () => {
        disableAll();

        if (!playerId) {
            setInfo('The game is full, sorry :(');
            isSpectator = true;
        } else if (playerId == serverState.sessionOwner) {
            setInfo('You may start whenever you want');
            startButton.enable();
        } else {
            setInfo('The game might start at any time.');
        }
    }

    if (serverState.status == STATUS.empty) {
        setEmpty();
    }

    if (serverState.status == STATUS.lobby) {
        setLobby();
    }

    if (serverState.status == STATUS.full || serverState.status == STATUS.started) {
        setFull();
    }
}

document.getElementById('createButton').addEventListener('click', () => {
    try {
        enroll();
    } catch (error) {
        setInfo(error);
    }
});
document.getElementById('joinButton').addEventListener('click', () => {
    try {
        enroll();
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