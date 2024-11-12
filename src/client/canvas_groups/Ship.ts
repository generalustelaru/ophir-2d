import Konva from 'konva';
import { Player, PlayerId } from '../../shared_types';
import { CanvasGroupInterface } from '../client_types';
import clientConstants from '../client_constants';

const { COLOR, SHIP_DATA } = clientConstants;

export class Ship implements CanvasGroupInterface<Player> {

    ship: Konva.Path;
    influence: Konva.Text;
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

        const darkColored: Array<PlayerId> = ['playerPurple', 'playerGreen'];
        const influenceTextColor = darkColored.includes(id) ? 'white' : 'black';

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

    public updateElement(player: Player): void {
        this.group.x(player.location.position.x);
        this.group.y(player.location.position.y);
        this.ship.stroke(player.isActive ? COLOR.activeShipBorder : COLOR.shipBorder);
        this.setInfluence(player.influence);
    };

    public destroy(): void {
        this.group.destroy()
    }
}