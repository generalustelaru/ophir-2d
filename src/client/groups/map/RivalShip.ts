import Konva from 'konva';
import { PlayerColor, ShipBearings } from '../../../shared_types';
import { DynamicGroupInterface } from '../../client_types';
import clientConstants from '../../client_constants';
import { ShipToken } from './ShipToken';

const { COLOR } = clientConstants;

export type RivalShipUpdate = {
    isControllable: boolean,
    bearings: ShipBearings,
}
export class RivalShip implements DynamicGroupInterface<RivalShipUpdate> {

    ship: ShipToken;
    group: Konva.Group;

    constructor(
        bearings: ShipBearings,
    ) {
        this.group = new Konva.Group({
            x: bearings.position.x + 25,
            y: bearings.position.y + 25,
        });

        this.ship = new ShipToken(COLOR.boneWhite);

        this.group.add(this.ship.getElement());
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
        this.ship.update(data.isControllable ? COLOR.activeShipBorder : COLOR.shipBorder);
    };

    public destroy(): void {
        this.group.destroy()
    }
}