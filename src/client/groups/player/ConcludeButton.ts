import Konva from 'konva';
import { Action, Coordinates } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import { ActionButton } from '../popular';
import constants from '~/client_constants';

const { ICON_DATA, COLOR } = constants;

type ConcludeButtonUpdate = {
    isControllable: boolean,
    mayConclude: boolean,
}
export class ConcludeButton extends ActionButton implements DynamicGroupInterface<ConcludeButtonUpdate>{
    private anchor: Konva.Path;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
    ) {
        const layout = { width: 50, height: 50, x: position.x, y: position.y };

        super(
            stage,
            layout,
            { action: Action.end_rival_turn, payload: null },
        );

        const hoverZone = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            hidden: true,
        });

        this.anchor = new Konva.Path({
            data: ICON_DATA.anchored.shape,
            fill: COLOR.disabled,
            scale: { x: 1.5, y: 1.5 },
        });

        this.group.add(hoverZone, this.anchor);
    }

    public update(update: ConcludeButtonUpdate) {
        const { mayConclude, isControllable } = update;
        const icon = !isControllable || (isControllable && mayConclude) ? ICON_DATA.anchored : ICON_DATA.not_anchored;
        this.anchor.data(icon.shape);
        this.anchor.fill(isControllable ? icon.fill : COLOR.disabled);
        this.setEnabled(mayConclude);
    }

    public getElement() {
        return this.group;
    }
}