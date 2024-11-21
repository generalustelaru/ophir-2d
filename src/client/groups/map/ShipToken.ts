import Konva from 'konva';
import { Player, PlayerId } from '../../../shared_types';
import { DynamicGroupInterface } from '../../client_types';
import clientConstants from '../../client_constants';

const { COLOR, SHIP_DATA } = clientConstants;

export class ShipToken implements DynamicGroupInterface<Player> {

    ship: Konva.Path;
    group: Konva.Group;

    constructor(
        offsetX: number,
        offsetY: number,
        fill: string,
        isActivePlayer: boolean,
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
            stroke: isActivePlayer ? COLOR.activeShipBorder : COLOR.shipBorder,
            strokeWidth: 2,
        });

        this.group.add(this.ship);
    }

    public getElement(): Konva.Group {
        return this.group
    }

    public getId(): PlayerId {
        return this.group.attrs.id as PlayerId
    }

    public updateElement(player: Player): void {
        this.group.x(player.location.position.x);
        this.group.y(player.location.position.y);
        this.ship.stroke(player.isActive ? COLOR.activeShipBorder : COLOR.shipBorder);
    };

    public destroy(): void {
        this.group.destroy()
    }
}