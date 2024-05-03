import Konva from 'konva';
import { ActionEventPayload, PlayerShipInterface } from '../../shared_types';
import state from '../state';
import constants from '../../constants';
import { Ship } from './ship';
const { COLOR, HEX_COUNT, MOVE_HINT, EVENT, ACTION } = constants;

export class PlayerShip implements PlayerShipInterface {

    ship: Konva.Rect;

    constructor (
        stage: Konva.Stage,
        layer: Konva.Layer,
        offsetX: number,
        offsetY: number,
        fill: string
    ) {
        this.ship = new Ship(
            offsetX,
            offsetY,
            fill,
            state.localPlayerId,
            true
        ).getElement();

        this.ship.on('dragstart', () => {
            state.konva.localShip.homePosition = { x: this.ship.x(), y: this.ship.y() };
        });

        this.ship.on('dragmove', () => {

            const players = state.server.players;

            for (let i = 0; i < HEX_COUNT; i++) {
                const hex = state.konva.hexes[i];
                hex.fill(hex.attrs.id == players[state.localPlayerId].location.hexId ? COLOR.illegal : COLOR.default);
            }

            const targetHex = state.konva.hexes.find(hex => hex.intersects(stage.getPointerPosition()));

            if (!targetHex) {
                return
            }

            switch (true) {
                // case players[state.localPlayerId].location.hexId == targetHex.attrs.id:
                //     state.map.playerShip.hoverStatus = MOVE_HINT.home;
                //     break;
                case players[state.localPlayerId].allowedMoves.includes(targetHex.attrs.id):
                    state.konva.localShip.hoverStatus = MOVE_HINT.valid;
                    targetHex.fill(COLOR.valid);
                    break;
                default:
                    state.konva.localShip.hoverStatus = MOVE_HINT.illegal;
                    targetHex.fill(COLOR.illegal);
            }
        });

        this.ship.on('dragend', () => {

            const targetHex = state.konva.hexes.find(hex => hex.intersects(stage.getPointerPosition()));
            const { x: positionX, y: positionY } = state.konva.localShip.homePosition;

            if (!targetHex) {
                this.ship.x(positionX);
                this.ship.y(positionY);
                layer.batchDraw();

                return
            }

            for (let i = 0; i < HEX_COUNT; i++) {
                state.konva.hexes[i].fill(COLOR.default);
            }

            switch (state.konva.localShip.hoverStatus) {
                case MOVE_HINT.home:
                case MOVE_HINT.illegal:
                    state.konva.hexes
                        .find(hex => hex.attrs.id == state.server.players[state.localPlayerId].location.hexId)
                        .fill(COLOR.illegal);
                    this.ship.x(positionX);
                    this.ship.y(positionY);
                    break;
                case MOVE_HINT.valid:
                    targetHex.fill(COLOR.anchored);
                    const payload: ActionEventPayload = {
                        action: ACTION.move,
                        details: {
                            hexId: targetHex.attrs.id,
                            position: { x: this.ship.x(), y: this.ship.y() }
                        }
                    };
                    window.dispatchEvent(new CustomEvent(
                        EVENT.action,
                        { detail: payload }
                    ));
            }

            layer.batchDraw();
        });
    }

    switchControl = (isActivePlayer: boolean) => {
        this.ship.draggable(isActivePlayer);
    }

    getElement = () => this.ship;
}