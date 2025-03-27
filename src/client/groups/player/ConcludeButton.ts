import Konva from "konva";
import { Action, Coordinates } from "../../../shared_types";
import constants from '../../client_constants';
import { DynamicGroupInterface } from "../../client_types";
import { ActionButton } from "../ActionButton";

const { ICON_DATA, COLOR } = constants;

export class ConcludeButton extends ActionButton implements DynamicGroupInterface<boolean>{
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

    public update(mayConclude: boolean) {
        this.setEnabled(mayConclude);
    }

    public getElement() {
        return this.group;
    }
}