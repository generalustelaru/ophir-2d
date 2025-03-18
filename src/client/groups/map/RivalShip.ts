import Konva from 'konva';
import { PlayerColor, ShipBearings } from '../../../shared_types';
import { DynamicGroupInterface } from '../../client_types';
import clientConstants from '../../client_constants';

const { COLOR, SHIP_DATA } = clientConstants;

export type RivalShipUpdate = {
    isControllable: boolean,
    bearings: ShipBearings,
}
export class RivalShip implements DynamicGroupInterface<RivalShipUpdate> {

    ship: Konva.Path;
    group: Konva.Group;

    constructor(
        offsetX: number,
        offsetY: number,
    ) {
        this.group = new Konva.Group({
            x: offsetX + 25,
            y: offsetY + 25,
            width: SHIP_DATA.dimensions.width,
            height: SHIP_DATA.dimensions.height,
        });

        this.ship = new Konva.Path({
            x: -15,
            y: -5,
            data: SHIP_DATA.shape,
            fill: COLOR.boneWhite,
            scale: {x: 1.5, y: 1.5},
            stroke: COLOR.shipBorder,
            strokeWidth: 2,
        });

        this.group.add(this.ship);
    }

    public getElement(): Konva.Group {
        return this.group
    }

    public getId(): PlayerColor {
        return this.group.attrs.id as PlayerColor
    }

    public update(data: RivalShipUpdate): void {
        this.group.x(data.bearings.position.x);
        this.group.y(data.bearings.position.y);
        this.ship.stroke(data.isControllable ? COLOR.activeShipBorder : COLOR.shipBorder);
    };

    public destroy(): void {
        this.group.destroy()
    }
}