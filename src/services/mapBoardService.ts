import Konva from 'konva';
import { PlayerId } from '../types';
import { Service } from "./service";
import { Ship } from '../canvas_objects/ship';
import { PlayerShip } from '../canvas_objects/playerShip';
import { MapHex } from '../canvas_objects/mapHex';
import state from '../state';
import constants from '../constants.json';

const { COLOR, HEX_OFFSET_DATA, EVENT } = constants;

export class MapBoardService extends Service {
    stage: Konva.Stage;
    layer: Konva.Layer;

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
            ) as Konva.RegularPolygon;
            state.map.islands.push(hexElement);
            this.layer.add(hexElement);
        });

        const playerIds = Object.keys(players) as PlayerId[];
        playerIds.forEach((id) => {
            if (players[id] && id != state.playerId) {
                const locationData = HEX_OFFSET_DATA.find(
                    hexItem => hexItem.id == players[id].location
                );
                const ship = new Ship(
                    this.stage.width(),
                    locationData.x,
                    locationData.y,
                    COLOR[id],
                    id
                ) as Konva.Rect;
                state.map.opponentShips.push(ship);
                this.layer.add(ship);
            }
        });

        if (!state.playerId) {
            dispatchEvent(new CustomEvent(
                EVENT.info,
                {detail: {details: 'You are a spectator'}}
            ));
            return;
        }

        const locationData = HEX_OFFSET_DATA.find(
            hexItem => hexItem.id == players[state.playerId].location
        );
        state.map.playerShip.element = new PlayerShip(
            this.stage,
            this.layer,
            locationData.x,
            locationData.y,
            COLOR[state.playerId],
        ) as unknown as Konva.Rect;
        this.layer.add(state.map.playerShip.element);
    }

    updateBoard = () => {
        state.map.opponentShips.forEach(ship => {
            const opponentId: PlayerId = ship.attrs.id;
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
