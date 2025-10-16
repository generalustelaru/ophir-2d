import Konva from 'konva';
import { GroupLayoutData, MegaGroupInterface } from '~/client_types';
import { EnrolmentState } from '~/shared_types';
import { EnrolmentModal } from '../groups/enrolment/EnrolmentModal';
import localState from '../state';

export class EnrolmentGroup implements MegaGroupInterface {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private modal: EnrolmentModal | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[1].add(this.group);
        this.stage = stage;
    }

    public drawElements() {
        this.modal = new EnrolmentModal(
            this.stage,
            {
                x: 50,
                y: 50,
                width: this.group.width() - 100,
                height: this.group.height() - 100,
            },
        );

        this.group.add(this.modal.getElement());
    }

    public update(state: EnrolmentState) {

        if (!this.modal)
            throw new Error('Can\'t update what ain\'t there');

        this.modal.update({ players: state.players, localPlayerColor: localState.playerColor });
    }

    public disable() {
        this.group.hide();
    }
}