import Konva from "konva";
import { Button } from "../Button";
import { Coordinates } from "~/shared_types";

export class CancelButton extends Button {
    constructor(stage: Konva.Stage, callback: Function, position:  Coordinates) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 50,
            height: 30,
        }

        super(stage, layout, callback);

        const buttonBackground = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: 'red',
        });

        const buttonLabel = new Konva.Text({
            width: layout.width,
            height: layout.height,
            fontSize: 14,
            align: 'center',
            verticalAlign: 'middle',
            text: 'Cancel',
            fontFamily: 'Custom',
        });

        this.group.add(buttonBackground, buttonLabel);
    }

    public getElement() {
        return this.group;
    }
}
