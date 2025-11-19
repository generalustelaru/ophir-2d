import Konva from 'konva';
import { RequestButton } from '../popular';
import { Action, Coordinates, SpecialistData } from '~/shared_types';
import { defineBobbing } from '~/client/animations';
export class ConfirmButton extends RequestButton {
    private textAnimation: Konva.Animation;
    constructor(stage: Konva.Stage, position: Coordinates, specialist: SpecialistData) {
        const layout = { ...position, width: 200, height: 300 };

        super(
            stage,
            layout,
            {
                action: Action.pick_specialist,
                payload: { name: specialist.name },
            },
        );

        const lockLayer = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
        });

        const buttonLabel = new Konva.Text({
            width: layout.width,
            fontSize: 26,
            fontStyle: 'bold',
            fill: 'black',
            align: 'center',
            y: 200,
            text: 'Pick',
            fontFamily: 'Custom',
        });

        this.textAnimation = defineBobbing(buttonLabel, { pixelAmplitude: 10, periodSeconds: 2 });

        this.group.add(lockLayer, buttonLabel);
        this.enable();
        this.hide();
    }

    public show() {
        this.textAnimation.start();
        this.group.visible(true);
    }

    public hide() {
        this.textAnimation.stop();
        this.group.visible(false);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}