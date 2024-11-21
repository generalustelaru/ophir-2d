import Konva from "konva";
import { DiceSix } from "../../shared_types";
import { Coordinates } from "../../shared_types";
import { Color, DynamicGroupInterface, GroupLayoutData } from "../client_types";

type PipDataElement = {position: Coordinates, included: Array<DiceSix>, element: Konva.Circle|null}
type PipData = Array<PipDataElement>
export class InfluenceDial implements DynamicGroupInterface<DiceSix|false> {
    private group: Konva.Group;
    private body: Konva.Rect;
    private dotMatrix: PipData;

    constructor(
        layout: GroupLayoutData,
        color: Color,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            offsetX: layout.x,
            offsetY: layout.y,
        });

        this.body = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: color,
            cornerRadius: 10,
        });
        this.group.add(this.body);

        const pipData: PipData = [
            { position: {x: 10, y: 10}, included: [2,3,4,5,6], element: null },
            { position: {x: 10, y: 25}, included: [6], element: null },
            { position: {x: 10, y: 40}, included: [4,5,6], element: null },
            { position: {x: 40, y: 10}, included: [4,5,6], element: null },
            { position: {x: 40, y: 25}, included: [6], element: null },
            { position: {x: 40, y: 40}, included: [2,3,4,5,6], element: null },
            { position: {x: 25, y: 25}, included: [1,3,5], element: null },
        ];
        // const length = pipData.length;

        pipData.forEach(pip => {
            const element = new Konva.Circle({
                x: pip.position.x,
                y: pip.position.y,
                radius: 6,
                fill: 'black',
            });
            pip.element = element;
            this.group.add(element);
        });

        this.dotMatrix = pipData;
        this.group.hide();
    }

    public updateElement(value: DiceSix|false): void {

        if (value === false) {
            this.group.hide();
        } else {
            const length = this.dotMatrix.length;

            for (let i = 0; i < length; i++) {
                const dot = this.dotMatrix[i];

                if (dot.included.includes(value)) {
                    dot.element?.show();
                } else {
                    dot.element?.hide();
                }
            }

            this.group.show();
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}