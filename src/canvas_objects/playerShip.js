import state from '../state.ts';
import constants from '../constants.json';
import { Ship } from './ship.js';
const { COLOR, HEX_COUNT, MOVE_HINT, EVENT, ACTION } = constants;

export class PlayerShip {
    ship = null
    homePosition = null
    hoverStatus = null
    islands = null

    constructor (stage, layer, offsetX, offsetY, fill) {
        this.ship = new Ship(
            stage.width(),
            offsetX,
            offsetY,
            fill,
            state.playerId,
            true
        );
        this.islands = state.map.islands;

        this.ship.on('dragstart', () => {
            this.homePosition = { x: this.ship.x(), y: this.ship.y() };
        });

        this.ship.on('dragmove', () => {

            const players = state.server.players;

            for (let i = 0; i < HEX_COUNT; i++) {
                const hex = this.islands[i];
                hex.fill(hex.attrs.id == players[state.playerId].location ? COLOR.currentHex : COLOR.default);
            }

            const targetHex = this.islands.find(hex => hex.intersects(stage.getPointerPosition()));

            if (!targetHex) {
                return
            }

            switch (true) {
                case players[state.playerId].location == targetHex.attrs.id:
                    this.hoverStatus = MOVE_HINT.home;
                    break;
                case players[state.playerId].allowedMoves.includes(targetHex.attrs.id):
                    this.hoverStatus = MOVE_HINT.valid;
                    targetHex.fill(COLOR.valid);
                    break;
                default:
                    this.hoverStatus = MOVE_HINT.illegal;
                    targetHex.fill(COLOR.illegal);
            }
        });

        this.ship.on('dragend', () => {

            const targetHex = this.islands.find(hex => hex.intersects(stage.getPointerPosition()));

            if (!targetHex) {
                this.ship.x(this.homePosition.x);
                this.ship.y(this.homePosition.y);
                layer.batchDraw();

                return
            }

            for (let i = 0; i < HEX_COUNT; i++) {
                this.islands[i].fill(COLOR.default);
            }

            switch (this.hoverStatus) {
                case MOVE_HINT.home:
                case MOVE_HINT.illegal:
                    this.islands
                        .find(hex => hex.attrs.id == state.server.players[state.playerId].location)
                        .fill(COLOR.currentHex);
                    this.ship.x(this.homePosition.x);
                    this.ship.y(this.homePosition.y);
                    break;
                case MOVE_HINT.valid:
                    targetHex.fill(COLOR.currentHex);
                    dispatchEvent(new CustomEvent(
                        EVENT.action,
                        {detail: {
                            action: ACTION.move,
                            details: {
                                hex: targetHex.attrs.id
                            }
                        }}
                    ));
            }

            layer.batchDraw();
        });

        return this.ship;
    }
}