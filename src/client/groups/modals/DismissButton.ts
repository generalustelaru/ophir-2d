import Konva from 'konva';
import { Coordinates } from '~/shared_types';
import { Button } from '../popular';

export class DismissButton extends Button {
    constructor(stage: Konva.Stage, callback: Function, position:  Coordinates, label: string) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 50,
            height: 30,
        };

        super(stage, layout, callback);

        const buttonBackground = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: 'white',
        });

        const buttonLabel = new Konva.Text({
            width: layout.width,
            height: layout.height,
            fontSize: 14,
            fontStyle: 'bold',
            align: 'center',
            verticalAlign: 'middle',
            text: label,
            fontFamily: 'Custom',
        });

        this.group.add(buttonBackground, buttonLabel);
        this.enable();
    }

    public getElement() {
        return this.group;
    }
}
