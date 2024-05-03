import Konva from 'konva';
import { PlayerId } from '../../shared_types';
import constants from '../../constants';

interface ShipInterface {
    getElement: () => Konva.Rect,
}

const { COLOR } = constants;

export class Ship implements ShipInterface {

    ship: Konva.Rect;

    constructor(
        offsetX: number,
        offsetY: number,
        fill: string,
        id: PlayerId,
        isPlayerShip = false
    ) {

        this.ship = new Konva.Rect({
            x: offsetX,
            y: offsetY,
            fill,
            stroke: isPlayerShip ? COLOR.localShipBorder : COLOR.shipBorder,
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