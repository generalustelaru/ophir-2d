import Konva from 'konva';
import { PlayerId } from '../types';
import constants from '../constants.json';

interface ShipInterface {
    getElement: () => Konva.Rect,
}

const { COLOR } = constants;

export class Ship implements ShipInterface {

    ship: Konva.Rect;

    constructor(
        // stageWidth: number,
        offsetX: number,
        offsetY: number,
        fill: string,
        id: PlayerId,
        isPlayerShip = false
    ) {

        this.ship = new Konva.Rect({
            // x: stageWidth / 2,
            // y: stageWidth / 2,
            x: offsetX,
            y: offsetY,
            fill,
            stroke: isPlayerShip ? 'white' : 'black',
            strokeWidth: 3,
            width: 40,
            height: 30,
            cornerRadius: [0, 0, 5, 30],
            id,
            draggable: isPlayerShip,
        });
    }

    getElement = () => this.ship;
}