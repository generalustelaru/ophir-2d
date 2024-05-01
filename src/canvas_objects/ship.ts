import Konva from 'konva';
import { PlayerId, ShipInterface} from '../types';
import constants from '../constants.json';

const { COLOR } = constants;

export class Ship implements ShipInterface {

    ship: Konva.Rect;

    constructor(
        stageWidth: number,
        offsetX: number,
        offsetY: number,
        fill: string,
        id: PlayerId,
        isPlayerShip = false
    ) {
        let strokeColor = 'black';

        if (isPlayerShip) {
            strokeColor = fill == COLOR.playerWhite ? 'gold' : 'white';
        }

        this.ship = new Konva.Rect({
            x: stageWidth / 2,
            y: stageWidth / 2,
            offsetX,
            offsetY,
            fill,
            stroke: strokeColor,
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