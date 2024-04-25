// import Konva from 'konva';
import constants from '../constants.json';
import state from '../state.js';
const { COLOR, HEX_COUNT, MOVE_HINT } = constants;

export class MapHex {
    constructor(width, name, x, y, fill) {

        return new Konva.RegularPolygon({
            x: width / 2,
            y: width / 2,
            offsetX: x,
            offsetY: y,
            sides: 6,
            radius: 100,
            fill: fill,
            stroke: 'black',
            strokeWidth: 1,
            id: name,
        });
    }
}

export class Ship {
    constructor(stageWidth, offsetX, offsetY, fill, id, isPlayerShip = false) {

        return new Konva.Rect({
            x: stageWidth / 2,
            y: stageWidth / 2,
            offsetX,
            offsetY,
            fill,
            stroke: isPlayerShip ? 'gold' : 'black',
            strokeWidth: 3,
            width: 40,
            height: 30,
            cornerRadius: [0, 0, 5, 30],
            id,
            draggable: isPlayerShip,
        });
    }
}

export class PlayerShip {
    ship = null
    homePosition = null
    hoverStatus = null
    islands = null

    constructor (wss, stage, layer, stageWidth, offsetX, offsetY, fill) {
        this.ship = new Ship(stageWidth, offsetX, offsetY, fill, state.playerId, true);
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
                    wss.send(JSON.stringify({
                        playerId: state.playerId,
                        action: 'move',
                        details: {
                            hex: targetHex.attrs.id
                        }
                    }));
            }

            layer.batchDraw();
        });

        return this.ship;
    }
}