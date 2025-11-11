import Konva from 'konva';
import { ModalBase } from './ModalBase';

export class AdvisorModal extends ModalBase {

    constructor(
        stage: Konva.Stage,
    ) {
        super(
            stage,
            { hasSubmit: false, dismissLabel: 'Cancel' },
            { width: 600, height: 400 },
        );

        const placeholder = new Konva.Text({
            text: 'advisor modal not fully implemented',
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width() - 5,
            align: 'center',
            verticalAlign: 'top',
            y: 10,
            fontFamily: 'Custom',
        });

        this.contentGroup.add(placeholder);
    }

    public show() {
        this.open();
    }
}