import Konva from "konva";
import { Color, DynamicGroupInterface } from "../../client_types";
import { Coordinates } from "../../../shared_types";
import { InterfaceButton } from "../InterfaceButton";

export class ModalButton extends InterfaceButton implements DynamicGroupInterface<string> {
    private background: Konva.Rect;
    private label: Konva.Text;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        color: Color,
        text: string,
        callback: Function,
    ) {
        super(stage, {...position, height: 50, width: 100}, callback);

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: color,
            cornerRadius: 15,
        });
        const scale = 1.4
        this.label = new Konva.Text({
            text: text,
            x: 5,
            y: 20,
            fill: 'white',
            scale: {x: scale, y: scale},
            fontFamily: 'Custom'
        })
        this.group.add(this.background, this.label);
    }

    public getElement() {
        return this.group;
    }

    public update(text: string) {
        this.label.text(text);
    }
}