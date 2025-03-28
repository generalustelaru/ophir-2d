import Konva from "konva";
import { Color, DynamicGroupInterface } from "../../client_types";
import { Coordinates } from "../../../shared_types";

export class ModalButton implements DynamicGroupInterface<string> {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private background: Konva.Rect;
    private label: Konva.Text;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        color: Color,
        text: string,
        callback: Function,
    ) {
        this.stage = stage;
        this.group = new Konva.Group({
            ...position, height: 50, width: 100,
        });

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
        })
        this.group.add(this.background, this.label);

        this.group.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
        });

        this.group.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });

        this.group.on('click', () => {
            callback();
        });
    }

    public getElement() {
        return this.group;
    }

    public update(text: string) {
        this.label.text(text);
    }
}