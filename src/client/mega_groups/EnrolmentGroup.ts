import Konva from 'konva';
import { MegaGroupInterface, LayerIds, Dimensions } from '~/client_types';
import { EnrolmentState, Unique } from '~/shared_types';
import { EnrolmentPanel } from '../groups/enrolment/EnrolmentPanel';
import localState from '../state';

export class EnrolmentGroup implements Unique<MegaGroupInterface> {
    private stage: Konva.Stage | null;
    private group: Konva.Group | null;
    private panel: EnrolmentPanel | null = null;

    constructor(stage: Konva.Stage, dimensions: Dimensions) {
        this.group = new Konva.Group({ ...dimensions });
        stage.getLayers()[LayerIds.modals].add(this.group);
        this.stage = stage;
    }

    public drawElements() {
        if (!this.stage || !this.group)
            return;

        this.panel = new EnrolmentPanel(
            this.stage,
            {
                x: 50,
                y: 50,
                width: this.group.width() - 100,
                height: this.group.height() - 100,
            },
        );

        this.group.add(this.panel.getElement());
    }

    public adjustDimensions(dimensions: Dimensions) {
        const { width, height } = dimensions;
        this.group?.width(width).height(height);
        this.panel?.rearrangeRows({
            x: 50, y: 50, width: width - 100, height: height - 100,
        });
    }

    public update(state: EnrolmentState) {
        this.panel?.update({ players: state.players, localPlayerColor: localState.playerColor });
    }

    public disable() {
        this.group?.hide();
    }

    public selfDecomission(): null {
        this.stage = null;
        this.panel = this.panel?.selfDecomission() || null;
        return null;
    }
}