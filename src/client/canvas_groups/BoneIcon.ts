import Konva from "konva";
import clientConstants from "../client_constants";
import { DiceSix } from "../client_types";

const { COLOR } = clientConstants;
export class BoneIcon {
    private group: Konva.Group;
    private body: Konva.Rect;
    private value: Konva.Text;

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

        this.value = new Konva.Text({
            x: 15,
            y: 6,
            text: "",
            fontSize: 40,
            fill: 'black',
        });
        this.group.add(this.value);

        this.group.hide();
    }

    public display(value: DiceSix|false): void {
        if (value === false) {
            this.group.hide();
        } else {
            this.value.text(value.toString());
            this.group.show();
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}