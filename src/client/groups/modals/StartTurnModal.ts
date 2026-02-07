import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { Aspect, StaticModalInterface } from '~/client/client_types';
import { Unique } from '~/shared_types';

export class StartTurnModal extends ModalBase implements Unique<StaticModalInterface<undefined>> {
    constructor(stage: Konva.Stage, aspect:Aspect) {
        super(
            stage,
            { hasSubmit: false, dismissLabel: 'Okay' },
            aspect,
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

    public repositionModal(aspect: Aspect): void {
        this.reposition(aspect);
    }

    public show() {
        this.open();
    }
}
