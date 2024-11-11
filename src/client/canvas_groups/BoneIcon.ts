import Konva from "konva";
import clientConstants from "../client_constants";
import { DiceSix } from "../client_types";
import { Coordinates } from "../../shared_types";

type DotData = Array<{position: Coordinates, included: Array<DiceSix>, element: Konva.Circle|null}>
const { COLOR } = clientConstants;
export class BoneIcon {
    private group: Konva.Group;
    private body: Konva.Rect;
    private dotMatrix: DotData;

    constructor() {
        this.group = new Konva.Group({
            width: 50,
            height: 50,
            offsetX: 25,
            offsetY: 25,
        });

        this.body = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.boneWhite,
            cornerRadius: 10,
        });
        this.group.add(this.body);

        const dotData: DotData = [
            { position: {x: 10, y: 10}, included: [2,3,4,5,6], element: null },
            { position: {x: 10, y: 25}, included: [6], element: null },
            { position: {x: 10, y: 40}, included: [4,5,6], element: null },
            { position: {x: 40, y: 10}, included: [4,5,6], element: null },
            { position: {x: 40, y: 25}, included: [6], element: null },
            { position: {x: 40, y: 40}, included: [2,3,4,5,6], element: null },
            { position: {x: 25, y: 25}, included: [1,3,5], element: null },
        ];
        const length = dotData.length;

        for (let i = 0; i < length; i++) {
            const dot = dotData[i];
            const element = new Konva.Circle({
                x: dot.position.x,
                y: dot.position.y,
                radius: 6,
                fill: 'black',
            });
            dot.element = element;
            this.group.add(element);
        }

        this.dotMatrix = dotData;
        this.group.hide();
    }

    public display(value: DiceSix|false): void {

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