import Konva from 'konva';
import { ModalBase } from './ModalBase';

export class StartTurnModal extends ModalBase {
    constructor(stage: Konva.Stage) {
        super(
            stage,
            { hasSubmit: false, dismissLabel: 'Okay' },
        );

        const text = new Konva.Text({
            text: 'It\'s your turn!',
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
