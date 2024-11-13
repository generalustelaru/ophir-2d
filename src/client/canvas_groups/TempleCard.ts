import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import clientConstants from "../client_constants";

const { COLOR } = clientConstants;

export class TempleCard implements DynamicGroupInterface<any> {

    private group: Konva.Group;
    private background: Konva.Rect;

    constructor(
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeBlue,
            stroke: 'white',
            cornerRadius: 15,
            strokeWidth: 3,
        });

        this.group.add(
            this.background,
        );
    }

    public updateElement(arg: any): void {
        console.log('TempleCard.updateElement', arg);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}