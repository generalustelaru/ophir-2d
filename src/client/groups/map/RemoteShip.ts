import Konva from 'konva';
import { Player, PlayerColor } from '../../../shared_types';
import { DynamicGroupInterface } from '../../client_types';
import clientConstants from '../../client_constants';

const { COLOR, SHIP_DATA } = clientConstants;

export class RemoteShip implements DynamicGroupInterface<Player> {

    ship: Konva.Path;
    group: Konva.Group;

    constructor(
        offsetX: number,
        offsetY: number,
        fill: string,
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

        this.ship = new Konva.Path({
            x: -15,
            y: -5,
            data: SHIP_DATA.shape,
            fill,
            scale: {x: 1.5, y: 1.5},
            stroke: isActivePlayer ? COLOR.activeShipBorder : COLOR.shipBorder,
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

    public update(player: Player): void {
        this.group.x(player.bearings.position.x);
        this.group.y(player.bearings.position.y);
        this.ship.stroke(player.isActive ? COLOR.activeShipBorder : COLOR.shipBorder);
    };

    public destroy(): void {
        this.group.destroy()
    }
}