import Konva from 'konva';
import { Coordinates, PlayerId } from '../../shared_types';
import { ShipInterface } from '../client_types';
import clientConstants from '../client_constants';

const { COLOR, SHIP_DATA } = clientConstants;

export class Ship implements ShipInterface {

    ship: Konva.Path;
    influence: Konva.Text;
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
            width: 20,
            height: 15,
            id,
        });

        this.ship = new Konva.Path({
            x: -15,
            y: -5,
            data: SHIP_DATA.shape,
            fill,
            scale: {x: 1.5, y: 1.5},
            stroke: COLOR.shipBorder,
            strokeWidth: 2,
        });

        this.group.add(this.ship);

        const influenceTextColor =
            id === 'playerGreen' || id === 'playerYellow'
                ? 'black'
                : 'white';

        this.influence = new Konva.Text({
            x: 6,
            y: 4,
            fontSize: 10,
            fontStyle: 'bold',
            fill: influenceTextColor,
        });

        this.group.add(this.influence);
    }

    public setInfluence(value: number): void {
        this.influence.text(value.toString());
    }
    public getElement(): Konva.Group {
        return this.group
    }
    public getId(): PlayerId {
        return this.group.attrs.id as PlayerId
    }
    public setPosition(coordinates: Coordinates): void {
        this.group.x(coordinates.x);
        this.group.y(coordinates.y);
    };
    public destroy(): void {
        this.group.destroy()
    }
}