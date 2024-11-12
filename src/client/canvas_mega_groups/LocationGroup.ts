import Konva from "konva";
import { CanvasMegaGroupInterface, GroupLayoutData } from "../client_types";

export class LocationGroup implements CanvasMegaGroupInterface {

    private group: Konva.Group;
    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
        });

        stage.getLayers()[0].add(this.group);
    }
    drawElements(): void {
        const testRect = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.group.width(),
            height: this.group.height(),
            fill: 'red',
        });
        const testText = new Konva.Text({
            x: 10,
            y: 10,
            text: 'Location Group',
            fontSize: 20,
            fill: 'white',
        });
        this.group.add(testRect, testText);
    }
    updateElements(): void {
        console.warn('updateElements: Method not implemented.');
    }
}