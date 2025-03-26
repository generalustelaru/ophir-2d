import Konva from "konva";
import { Coordinates } from "../../../shared_types";
import constants from '../../client_constants';
import { DynamicGroupInterface } from "../../client_types";

const { ICON_DATA, COLOR } = constants;

export class ConcludeButton implements DynamicGroupInterface<void>{
    private group: Konva.Group;
    private anchor: Konva.Path;

    constructor(
        position: Coordinates,
    ) {
        this.anchor = new Konva.Path({
            data: ICON_DATA.anchored.shape,
            fill: COLOR.disabled,
            x: position.x,
            y: position.y,
            scale: { x: 1.5, y: 1.5 },
        });

        this.group = new Konva.Group()
        this.group.add(this.anchor)
    }

    public update() {
        return;
    }

    public getElement() {
        return this.group;
    }
}