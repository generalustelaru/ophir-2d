import Konva from 'konva';
import { MapHex, PlayerShip, Ship } from './elements/mapBoard.js';
import constants from './constants.json';
import state from './state.js';
import { CommunicationService } from './commService.js';
import { EventHandler } from './eventHandler.js';

const { STATUS, COLOR, HEX_OFFSET_DATA, ACTION, EVENT } = constants;

const handler = new EventHandler();
const serverUrl = 'ws://localhost:8080';

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

const commService = CommunicationService.getInstance();
commService.createConnection(serverUrl);

window.addEventListener(EVENT.update, () => {
    if ((state.server.status == STATUS.started && state.playerId) || state.isSpectator) {
        if (state.isBoardDrawn) {
            updateBoard();
        } else {
            setInfo('The \'game\' has started');
            drawBoard();
            state.isBoardDrawn = true;
        }
    }
    updatePreSessionUi();
});

const sendEnrollMessage = () => {
    state.playerId = document.getElementById('playerColorSelect').value;

    if (!state.playerId) {
        return setInfo('Please select a color');
    }

    if (state.server.availableSlots.includes(state.playerId)) {
        commService.sendMessage(ACTION.enroll);
    } else {
        setInfo('This color has just been taken :(');
    }
}
const setInfo = (text) => {
    const info = document.getElementById('info');
    info.innerHTML = text;
}

const drawBoard = () => {
    const players = state.server.players;

    HEX_OFFSET_DATA.forEach(hexItem => {
        const hexElement = new MapHex(
            stage.width(),
            hexItem.id,
            hexItem.x,
            hexItem.y,
            players[state.playerId]?.location == hexItem.id ? COLOR.currentHex : COLOR.default
        );
        state.map.islands.push(hexElement);
        layer.add(hexElement);
    });

    for (const opponentId in players) {

        if (players[opponentId] && opponentId != state.playerId) {
            const locationData = HEX_OFFSET_DATA.find(hexItem => hexItem.id == players[opponentId].location);
            const ship = new Ship(
                stage.width(),
                locationData.x,
                locationData.y,
                COLOR[opponentId],
                opponentId
            );
            state.map.opponentShips.push(ship);
            layer.add(ship);
        }
    }

    if (state.isSpectator) {
        setInfo('You are a spectator');
        return;
    }

    const locationData = HEX_OFFSET_DATA.find(hexItem => hexItem.id == players[state.playerId].location);
    state.map.playerShip = new PlayerShip(
        stage,
        layer,
        locationData.x,
        locationData.y,
        COLOR[state.playerId],
    );
    layer.add(state.map.playerShip);
}

const updateBoard = () => {
    state.map.opponentShips.forEach(ship => {
        const opponentId = ship.attrs.id;
        const players = state.server.players;

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

const updatePreSessionUi = () => {

    const createButton = {
        element: document.getElementById('createButton'),
        enable: () => {
            createButton.element.disabled = false;
            createButton.element.addEventListener('click', () => sendEnrollMessage());
        },
        disable: () => {
            createButton.element.disabled = true;
            createButton.element.removeEventListener('click', () => sendEnrollMessage());
        },
    }

    const joinButton = {
        element: document.getElementById('joinButton'),
        enable: () => {
            joinButton.element.disabled = false;
            joinButton.element.addEventListener('click', () => sendEnrollMessage());
        },
        disable: () => {
            joinButton.element.disabled = true
            joinButton.element.removeEventListener('click', () => sendEnrollMessage());
        },
    }

    const playerColorSelect = {
        element: document.getElementById('playerColorSelect'),
        enable: () => {
            playerColorSelect.element.disabled = false;
            Array.from(playerColorSelect.element.options).forEach(option => {
                option.disabled = state.server.players[option.value] != null;
            });
        },
        disable: () => playerColorSelect.element.disabled = true,
    }

    const startButton = {
        element: document.getElementById('startButton'),
        enable: () => {
            startButton.element.disabled = false;
            startButton.element.addEventListener('click', () => commService.sendMessage(ACTION.start));
        },
        disable: () => {
            startButton.element.disabled = true;
            startButton.element.removeEventListener('click', () => commService.sendMessage(ACTION.start));
        },
    }

    createButton.disable();
    joinButton.disable();
    playerColorSelect.disable();
    startButton.disable();

    const enable = (...buttons) => {
        buttons.forEach(button => button.enable());
    }

    switch (state.server.status) {
        case STATUS.empty:
            enable(createButton, playerColorSelect);
            setInfo('You may create the game');
            break;
        case STATUS.lobby:
            if (!state.playerId) {
                enable(joinButton, playerColorSelect);
                setInfo('A game is waiting for you');
            } else if (state.server.sessionOwner == state.playerId) {
                enable(startButton);
                setInfo('You may wait for more player or start');
            } else {
                setInfo('Waiting for players to join...');
            }
            break;
        case STATUS.full:
            if (!state.playerId) {
                setInfo('The game is full, sorry :(');
                state.isSpectator = true;
            } else if (state.playerId == state.server.sessionOwner) {
                setInfo('You may start whenever you want');
                enable(startButton);
            } else {
                setInfo('The game might start at any time.');
            }
            break;
        default:
            break;
    }
}

