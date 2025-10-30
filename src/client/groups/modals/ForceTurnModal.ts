import Konva from 'konva';
import { ModalBase } from './ModalBase';

export class ForceTurnModal extends ModalBase {
    constructor(stage: Konva.Stage) {
        super(
            stage,
            { hasSubmit: false, cancelLabel: 'Close' },
            { width: 400, height: 150 },
        );

        const text = new Konva.Text({
            text: 'You\'ve failed your second sailing attempt.\nThe turn has passed to the next player.',
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width(),
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'left',
            fontFamily: 'Custom',
        });

        this.contentGroup.add(text);
    }

    public show() {
        this.open();
    }
}
