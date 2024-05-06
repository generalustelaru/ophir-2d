import Konva from 'konva';
import { Coordinates, PlayerId, ShipInterface } from '../../shared_types';
import sharedConstants from '../../shared_constants';

const { COLOR } = sharedConstants;

export class Ship implements ShipInterface {

    ship: Konva.Rect;
    label: Konva.Text;
    group: Konva.Group;

    constructor(
        offsetX: number,
        offsetY: number,
        fill: string,
        id: PlayerId,
    ) {
        this.group = new Konva.Group({
            x: offsetX,
            y: offsetY,
            width: 40,
            height: 30,
            id,
        });

        this.ship = new Konva.Rect({
            fill,
            stroke: COLOR.shipBorder,
            strokeWidth: 3,
            width: 40,
            height: 30,
            cornerRadius: [0, 0, 5, 30],
        });

        this.group.add(this.ship);

        this.label = new Konva.Text({
            x: 5,
            y: 5,
            text: '???',
            fontSize: 20,
            fill: 'black',
        });

        this.group.add(this.label);
    }

    public setInfluence = (value: number) => {
        this.label.text(value.toString());
    }
    public getElement = () => this.group;
    public getId = () => this.group.attrs.id as PlayerId;
    public setPosition = (coordinates: Coordinates) => {
        this.group.x(coordinates.x);
        this.group.y(coordinates.y);
    };
    public destroy = () => this.group.destroy();
}