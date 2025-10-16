import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { Action } from '~/shared_types';

export class EndTurnModal extends ModalBase {
    constructor(stage: Konva.Stage) {
        super(
            stage,
            { hasSubmit: true, actionMessage: { action: Action.end_turn, payload: null } },
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
