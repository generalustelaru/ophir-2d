import Konva from "konva";
import { ClientMessage, Coordinates } from "~/shared_types";
import { ActionButton } from "../ActionButton";

export class AcceptButton extends ActionButton {

    constructor(stage: Konva.Stage, position: Coordinates, actionMessage: ClientMessage) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 50,
            height: 30,
        }

        super(stage, layout, actionMessage);

        const buttonBackground = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: 'green',
        });

        const buttonLabel = new Konva.Text({
            width: layout.width,
            height: layout.height,
            fontSize: 14,
            align: 'center',
            verticalAlign: 'middle',
            text: 'Accept',
            fontFamily: 'Custom',
        });

        this.group.add(buttonBackground, buttonLabel);
    }

    public getElement() {
        return this.group;
    }
}
