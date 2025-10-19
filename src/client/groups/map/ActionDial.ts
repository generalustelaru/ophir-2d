import Konva from 'konva';
import { Action, Player } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import { ActionButton } from '../popular';
import constants from '~/client_constants';

const { ICON_DATA, COLOR } = constants;
export class ActionDial extends ActionButton implements DynamicGroupInterface<Player> {

    // private group: Konva.Group;
    private luminary: Konva.Path;

    constructor(stage: Konva.Stage, parent: Konva.Group, isActivePlayer: boolean) {

        super(
            stage,
            { width: 100, height: 100, x:0, y:0 },
            { action: Action.undo, payload: null },
        );

        const data = isActivePlayer ? ICON_DATA.sun : ICON_DATA.moon;
        this.luminary = new Konva.Path({
            x: 50,
            y: parent.height() - 130,
            data: data.shape,
            fill: isActivePlayer ? data.fill : COLOR.disabled,
            scale: { x: 1.5, y: 1.5 },
        });
        this.group.add(this.luminary);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(player: Player): void {
        this.luminary.data(ICON_DATA[player.mayUndo ? 'sun' : 'moon'].shape);
        this.luminary.fill(ICON_DATA[player.mayUndo ? 'sun' : 'moon'].fill);
        this.setEnabled(player.mayUndo);
    }
}
