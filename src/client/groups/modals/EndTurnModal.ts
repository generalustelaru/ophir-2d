import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { Action } from '~/shared_types';
import { StaticModalInterface } from '~/client/client_types';

export class EndTurnModal extends ModalBase implements StaticModalInterface {
    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: { action: Action.end_turn, payload: null },
                submitLabel: 'End',
                cancelLabel: 'Cancel',
            },
        );

        const text = new Konva.Text({
            text: 'End your turn?',
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
