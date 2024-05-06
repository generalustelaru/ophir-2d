import Konva from 'konva';
import { Coordinates, PlayerId, ShipInterface } from '../../shared_types';
import sharedConstants from '../../shared_constants';

const { COLOR } = sharedConstants;

export class Ship implements ShipInterface {

    ship: Konva.Rect;

    constructor(
        offsetX: number,
        offsetY: number,
        fill: string,
        id: PlayerId,
    ) {

        this.ship = new Konva.Rect({
            x: offsetX,
            y: offsetY,
            fill,
            stroke: COLOR.shipBorder,
            strokeWidth: 3,
            width: 40,
            height: 30,
            cornerRadius: [0, 0, 5, 30],
            id,
            draggable: false,
        });
    }

    public getElement = () => this.ship;
    public getId = () => this.ship.attrs.id as PlayerId;
    public setPosition = (coordinates: Coordinates) => {
        this.ship.x(coordinates.x);
        this.ship.y(coordinates.y);
    };
    public destroy = () => this.ship.destroy();
}