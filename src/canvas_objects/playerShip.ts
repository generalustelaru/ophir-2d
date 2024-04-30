import Konva from 'konva';
import { ActionEventPayload } from '../types';
import state from '../state';
import constants from '../constants.json';
import { Ship } from './ship';
const { COLOR, HEX_COUNT, MOVE_HINT, EVENT, ACTION } = constants;

export class PlayerShip {

    constructor (
        stage: Konva.Stage,
        layer: Konva.Layer,
        offsetX: number,
        offsetY: number,
        fill: string
    ) {
        const ship = new Ship(
            stage.width(),
            offsetX,
            offsetY,
            fill,
            state.playerId,
            true
        ) as Konva.Rect;

        ship.on('dragstart', () => {
            state.map.playerShip.homePosition = { x: ship.x(), y: ship.y() };
        });

        ship.on('dragmove', () => {

            const players = state.server.players;

            for (let i = 0; i < HEX_COUNT; i++) {
                const hex = state.map.islands[i];
                hex.fill(hex.attrs.id == players[state.playerId].location ? COLOR.currentHex : COLOR.default);
            }

            const targetHex = state.map.islands.find(hex => hex.intersects(stage.getPointerPosition()));

            if (!targetHex) {
                return
            }

            switch (true) {
                case players[state.playerId].location == targetHex.attrs.id:
                    state.map.playerShip.hoverStatus = MOVE_HINT.home;
                    break;
                case players[state.playerId].allowedMoves.includes(targetHex.attrs.id):
                    state.map.playerShip.hoverStatus = MOVE_HINT.valid;
                    targetHex.fill(COLOR.valid);
                    break;
                default:
                    state.map.playerShip.hoverStatus = MOVE_HINT.illegal;
                    targetHex.fill(COLOR.illegal);
            }
        });

        ship.on('dragend', () => {

            const targetHex = state.map.islands.find(hex => hex.intersects(stage.getPointerPosition()));
            const { x: positionX, y: positionY } = state.map.playerShip.homePosition;

            if (!targetHex) {
                ship.x(positionX);
                ship.y(positionY);
                layer.batchDraw();

                return
            }

            for (let i = 0; i < HEX_COUNT; i++) {
                state.map.islands[i].fill(COLOR.default);
            }

            switch (state.map.playerShip.hoverStatus) {
                case MOVE_HINT.home:
                case MOVE_HINT.illegal:
                    state.map.islands
                        .find(hex => hex.attrs.id == state.server.players[state.playerId].location)
                        .fill(COLOR.currentHex);
                    ship.x(positionX);
                    ship.y(positionY);
                    break;
                case MOVE_HINT.valid:
                    targetHex.fill(COLOR.currentHex);
                    const payload: ActionEventPayload = {
                        action: ACTION.move,
                        details: {
                            hex: targetHex.attrs.id
                        }
                    };
                    window.dispatchEvent(new CustomEvent(
                        EVENT.action,
                        { detail: payload }
                    ));
            }

            layer.batchDraw();
        });

        return ship;
    }
}