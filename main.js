import Konva from 'konva';
import { MapHex, Ship } from './elements/mapBoard.js';
import constants from './constants.json';

const { STATUS, MOVE_HINT, COLOR, HEX_OFFSET_DATA, HEX_COUNT, ACTION } = constants;

const serverUrl = 'ws://localhost:8080';
let playerId = null;
let isBoardDrawn = false;
let isSpectator = false;

let serverState = {}

const mapBoard = {
    playerShip: null,
    opponentShips: [],
    islands: [],
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
        action: ACTION.inquire,
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

const createPlayerShip = (x, y, color) => {

    const ship = new Ship(stage.width(), x, y, color, playerId, true);

    let homePosition = null;

    ship.on('dragstart', () => {
        homePosition = { x: ship.x(), y: ship.y() };
    });

    let hoverStatus = null;

    ship.on('dragmove', () => {

        const players = serverState.players;

        for (let i = 0; i < HEX_COUNT; i++) {
            const hex = mapBoard.islands[i];
            hex.fill(hex.attrs.id == players[playerId].location ? COLOR.currentHex : COLOR.default);
        }

        const targetHex = mapBoard.islands.find(hex => isPointerOver(hex));

        if (!targetHex) {
            return
        }

        switch (true) {
            case players[playerId].location == targetHex.attrs.id:
                hoverStatus = MOVE_HINT.home;
                break;
            case players[playerId].allowedMoves.includes(targetHex.attrs.id):
                hoverStatus = MOVE_HINT.valid;
                targetHex.fill(COLOR.valid);
                break;
            default:
                hoverStatus = MOVE_HINT.illegal;
                targetHex.fill(COLOR.illegal);
        }
    });

    ship.on('dragend', () => {

        const targetHex = mapBoard.islands.find(hex => isPointerOver(hex));

        if (!targetHex) {
            ship.x(homePosition.x);
            ship.y(homePosition.y);
            layer.batchDraw();

            return
        }

        for (let i = 0; i < HEX_COUNT; i++) {
            mapBoard.islands[i].fill(COLOR.default);
        }

        switch (hoverStatus) {
            case MOVE_HINT.home:
            case MOVE_HINT.illegal:
                mapBoard.islands
                    .find(hex => hex.attrs.id == serverState.players[playerId].location)
                    .fill(COLOR.currentHex);
                ship.x(homePosition.x);
                ship.y(homePosition.y);
                break;
            case MOVE_HINT.valid:
                const hex = mapBoard.islands.find(hex => isPointerOver(hex));
                hex.fill(COLOR.currentHex);
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

    HEX_OFFSET_DATA.forEach(hexItem => {
        const hexElement = new MapHex(
            stage.width(),
            hexItem.id,
            hexItem.x,
            hexItem.y,
            players[playerId]?.location == hexItem.id ? COLOR.currentHex : COLOR.default
        );
        mapBoard.islands.push(hexElement);
        layer.add(hexElement);
    });

    for (const opponentId in players) {

        if (players[opponentId] && opponentId != playerId) {
            const locationData = HEX_OFFSET_DATA.find(hexItem => hexItem.id == players[opponentId].location);
            const ship = new Ship(
                stage.width(),
                locationData.x,
                locationData.y,
                COLOR[opponentId],
                opponentId
            );
            mapBoard.opponentShips.push(ship);
            layer.add(ship);
        }
    }

    if (isSpectator) {
        setInfo('You are a spectator');
        return;
    }

    const locationData = HEX_OFFSET_DATA.find(hexItem => hexItem.id == players[playerId].location);
    mapBoard.playerShip = createPlayerShip(locationData.x, locationData.y, COLOR[playerId]);
    layer.add(mapBoard.playerShip);
}

const updateBoard = () => {
    mapBoard.opponentShips.forEach(ship => {
        const opponentId = ship.attrs.id;
        const players = serverState.players;

        if (players[opponentId]) {
            const locationData = HEX_OFFSET_DATA.find(hexItem => hexItem.id == players[opponentId].location);
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