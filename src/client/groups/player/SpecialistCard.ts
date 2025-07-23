import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { PlayerColor } from "../../../shared_types";
import clientConstants from "../../client_constants";

const { COLOR } = clientConstants;
export class SpecialistCard implements DynamicGroupInterface<undefined> {
    private group: Konva.Group;

    constructor(
        layout: GroupLayoutData,
        playerColor: PlayerColor
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            visible: false,
        });

        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR[`dark${playerColor}`],
        });

        this.group.add(background);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(): void {
        this.group.visible() ? this.group.hide(): this.group.show();
    }
}