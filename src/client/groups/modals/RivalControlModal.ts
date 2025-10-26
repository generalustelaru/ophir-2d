import Konva from 'konva';
import { ModalBase } from './ModalBase';

export class RivalControlModal extends ModalBase {
    constructor(stage: Konva.Stage) {
        super(
            stage,
            { hasSubmit: false, cancelLabel: 'Play' },
        );

        const text = new Konva.Text({
            text: 'You must move the rival ship before continuing.',
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width(),
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'middle',
            fontFamily: 'Custom',
        });

        this.contentGroup.add(text);
    }

    public show() {
        this.open();
    }
}
