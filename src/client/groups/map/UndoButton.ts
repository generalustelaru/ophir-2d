import Konva from 'konva';
import { Action, Coordinates, Player } from '~/shared_types';
import { DynamicGroupInterface, Unique } from '~/client_types';
import { ActionButton } from '../popular';
import constants from '~/client_constants';

const { ICON_DATA, COLOR } = constants;

export class UndoButton extends ActionButton implements Unique<DynamicGroupInterface<Player>> {
    private icon: Konva.Path;

    constructor(stage: Konva.Stage, position: Coordinates, isActivePlayer: boolean) {

        super(
            stage,
            { width: 60, height: 60, ...position },
            { action: Action.undo, payload: null },
        );

        const hoverZone = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            hidden: true,
        });

        const data = ICON_DATA.undo_arrow;
        this.icon = new Konva.Path({
            x: 8,
            y: 9,
            data: data.shape,
            fill: isActivePlayer ? data.fill : COLOR.disabled,
            scale: { x: 2, y: 2 },
        });
        this.group.add(hoverZone, this.icon);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(player: Player): void {
        this.icon.fill(player.mayUndo ? ICON_DATA.undo_arrow.fill : COLOR.disabled);
        this.setEnabled(player.mayUndo);
    }
}
