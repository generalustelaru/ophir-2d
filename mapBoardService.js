import Konva from 'konva';
import { Service } from "./service.js";
import { Ship } from './canvas_objects/ship.js';
import { PlayerShip } from './canvas_objects/playerShip.js';
import { MapHex } from './canvas_objects/mapHex.js';
import state from './state.js';
import constants from './constants.json';

const { COLOR, HEX_OFFSET_DATA } = constants;

export class MapBoardService extends Service {
    stage = null;
    layer = null;

    constructor() {
        super();
    }

    initiateCanvas = () => {
        this.stage = new Konva.Stage({
            container: 'container',
            visible: true,
            opacity: 1,
            width: 500,
            height: 500,
        });

        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        this.layer.draw();
    }

    drawBoard = () => {
        const players = state.server.players;

        HEX_OFFSET_DATA.forEach(hexItem => {
            const hexElement = new MapHex(
                this.stage.width(),
                hexItem.id,
                hexItem.x,
                hexItem.y,
                players[state.playerId]?.location == hexItem.id
                    ? COLOR.currentHex
                    : COLOR.default
            );
            state.map.islands.push(hexElement);
            this.layer.add(hexElement);
        });

        for (const opponentId in players) {

            if (players[opponentId] && opponentId != state.playerId) {
                const locationData = HEX_OFFSET_DATA.find(
                    hexItem => hexItem.id == players[opponentId].location
                );
                const ship = new Ship(
                    this.stage.width(),
                    locationData.x,
                    locationData.y,
                    COLOR[opponentId],
                    opponentId
                );
                state.map.opponentShips.push(ship);
                this.layer.add(ship);
            }
        }

        if (state.isSpectator) {
            dispatchEvent(new CustomEvent(
                EVENT.info,
                {detail: {text: 'You are a spectator'}}
            ));
            return;
        }

        const locationData = HEX_OFFSET_DATA.find(
            hexItem => hexItem.id == players[state.playerId].location
        );
        state.map.playerShip = new PlayerShip(
            this.stage,
            this.layer,
            locationData.x,
            locationData.y,
            COLOR[state.playerId],
        );
        this.layer.add(state.map.playerShip);
    }

    updateBoard = () => {
        state.map.opponentShips.forEach(ship => {
            const opponentId = ship.attrs.id;
            const players = state.server.players;

            if (players[opponentId]) {
                const locationData = HEX_OFFSET_DATA.find(
                    hexItem => hexItem.id == players[opponentId].location
                );
                ship.offsetX(locationData.x);
                ship.offsetY(locationData.y);

                this.layer.batchDraw();
            } else {
                dispatchEvent(new CustomEvent(
                    EVENT.info,
                    {detail: {text: `${opponentId} has left the game`}}
                ));
                ship.destroy();
            }
        });
    }
}
