
import Konva from 'konva';
import { CanvasGroupInterface } from '../client_types';
import { Player, PlayerId } from '../../shared_types';
import { FavorDial, CargoDisplay } from './CanvasGroups';
import clientConstants from '../client_constants';

const { COLOR } = clientConstants;

export class PlayerCard implements CanvasGroupInterface<Player> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private cargoDisplay: CargoDisplay;
    private favorDial: FavorDial;
    private id: PlayerId;

    constructor(
        player: Player,
        localPlayerId: PlayerId|null,
        yOffset: number,
        isLargeHold: boolean = false,
    ) {
        this.id = player.id;
        this.group = new Konva.Group({
            width: 200,
            height: 100,
            x: localPlayerId === player.id ? 0 : 25,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR[player.id],
            stroke: 'white',
            cornerRadius: 15,
            strokeWidth: player.isActive ? 3 : 0,
        });

        this.cargoDisplay = new CargoDisplay(isLargeHold);
        this.favorDial = new FavorDial(player.favor);
        this.group.add(
            this.background,
            this.cargoDisplay.getElement(),
            this.favorDial.getElement(),
        );
    }

    public updateElement(player: Player): void {
        this.cargoDisplay.updateElement(player.cargo);
        this.background.strokeWidth(player.isActive ? 3 : 0);
        this.favorDial.updateElement(player.favor);
    }

    public getId(): PlayerId {
        return this.id;
    }

    public getElement() {
        return this.group;
    }
}
