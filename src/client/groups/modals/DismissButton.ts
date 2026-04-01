import Konva from 'konva';
import { Coordinates } from '~/shared_types';
import { Button } from '../popular';

export class DismissButton extends Button {
    private buttonBackground: Konva.Rect;

    constructor(stage: Konva.Stage, callback: Function, position:  Coordinates, label: string) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 50,
            height: 30,
        };

        super(stage, layout, callback);

        this.buttonBackground = new Konva.Rect({
            width: layout.width,
            height: layout.height,
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

        this.enable();
        this.group.add(this.buttonBackground, buttonLabel);
    }

    public enable() {
        super.enable();
        this.buttonBackground.fill('white');
    }

    public disable() {
        super.disable();
        this.buttonBackground.fill('gray');
    }

    public getElement() {
        return this.group;
    }
}
