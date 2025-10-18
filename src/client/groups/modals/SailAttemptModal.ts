import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { Action } from '~/shared_types';
import { InfluenceDial } from '../InfluenceDial';
import clientConstants from '~/client/client_constants';
import { SailAttemptArgs } from '~/client/client_types';

const { COLOR } = clientConstants;

export class SailAttemptModal extends ModalBase {
    private toSailDial: InfluenceDial;
    constructor(stage: Konva.Stage) {
        super(
            stage,
            { hasSubmit: true, actionMessage: null },
        );
        this.toSailDial = new InfluenceDial(
            {
                x: this.contentGroup.width() / 2  * -1 + 25,
                y: -25,
            },
            COLOR.boneWhite);

        this.contentGroup.add(this.toSailDial.getElement());
    }

    public show(data: SailAttemptArgs) {
        this.toSailDial.update(data.toSail);

        this.open({ action: Action.move, payload: data.destination });
    }
}
