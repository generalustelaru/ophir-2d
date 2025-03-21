import Konva from 'konva';
import { PlayerColor, ShipBearings } from '../../../shared_types';
import { DynamicGroupInterface } from '../../client_types';
import clientConstants from '../../client_constants';
import { ShipToken } from './ShipToken';

const { COLOR } = clientConstants;

export type RivalShipUpdate = {
    isControllable: boolean,
    bearings: ShipBearings,
    activePlayerColor: PlayerColor,
}
export class RivalShip implements DynamicGroupInterface<RivalShipUpdate> {

    private ship: ShipToken;
    private group: Konva.Group;
    private localPlayerColor: PlayerColor | null;

    constructor(
        data: RivalShipUpdate,
        localPlayerColor: PlayerColor | null
    ) {
        this.localPlayerColor = localPlayerColor;
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

    public update(data: RivalShipUpdate): void {
        this.group.x(data.bearings.position.x);
        this.group.y(data.bearings.position.y);
        this.group.draggable(data.isControllable && data.activePlayerColor === this.localPlayerColor);
        this.ship.update(data.isControllable ? COLOR[data.activePlayerColor] : COLOR.shipBorder);
    };
}
