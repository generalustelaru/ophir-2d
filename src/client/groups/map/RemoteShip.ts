import Konva from 'konva';
import { Player, PlayerColor } from '~/shared_types';
import { Color, DynamicGroupInterface } from '~/client_types';
import clientConstants from '~/client_constants';
import { ShipToken } from '../ShipToken';

const { COLOR, SHIP_DATA } = clientConstants;

export class RemoteShip implements DynamicGroupInterface<Player> {

    ship: ShipToken;
    group: Konva.Group;

    constructor(
        offsetX: number,
        offsetY: number,
        fill: Color,
        isActivePlayer: boolean,
        id: PlayerColor,
    ) {
        this.group = new Konva.Group({
            x: offsetX,
            y: offsetY,
            width: SHIP_DATA.dimensions.width,
            height: SHIP_DATA.dimensions.height,
            id,
        });

        this.ship = new ShipToken(
            fill,
            { stroke: isActivePlayer ? COLOR.activeShipBorder : COLOR.shipBorder },
        );

        this.group.add(this.ship.getElement());
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public getId(): PlayerColor {
        return this.group.attrs.id as PlayerColor;
    }

    public update(player: Player): void {
        this.group.x(player.bearings.position.x);
        this.group.y(player.bearings.position.y);
        this.ship.update(player.isActive ? COLOR.activeShipBorder : COLOR.shipBorder);
    };

    public destroy(): void {
        this.group.destroy();
    }
}