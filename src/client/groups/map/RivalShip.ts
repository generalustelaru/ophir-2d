import Konva from 'konva';
import { PlayerColor, ShipBearings } from '../../../shared_types';
import { DynamicGroupInterface } from '../../client_types';
import clientConstants from '../../client_constants';
import { ShipToken } from './ShipToken';

const { COLOR } = clientConstants;

export type RivalShipUpdate = {
    isControllable: boolean,
    bearings: ShipBearings,
    activePlayerColor: PlayerColor
}
export class RivalShip implements DynamicGroupInterface<RivalShipUpdate> {

    ship: ShipToken;
    group: Konva.Group;

    constructor(
        data: RivalShipUpdate,
    ) {
        this.group = new Konva.Group({
            x: data.bearings.position.x,
            y: data.bearings.position.y,
        });

        this.ship = new ShipToken(COLOR.boneWhite);

        this.group.add(this.ship.getElement());
        this.update(data);
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
        this.ship.update(data.isControllable ? COLOR[data.activePlayerColor] : COLOR.shipBorder);
    };

    public destroy(): void {
        this.group.destroy()
    }
}