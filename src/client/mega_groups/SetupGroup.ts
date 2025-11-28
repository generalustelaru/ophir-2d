import Konva from 'konva';
import { GroupLayoutData, LayerIds, MegaGroupInterface } from '~/client_types';
import { SetupState, Unique } from '~/shared_types';
import { ShowHideButton } from '../groups/setup/ShowHideButton';
import { SetupPanel } from '../groups/setup/SetupPanel';

export class SetupGroup implements Unique<MegaGroupInterface> {
    private stage: Konva.Stage | null;
    private group: Konva.Group | null;
    private panel: SetupPanel | null = null;
    private showHideButton: ShowHideButton | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[LayerIds.modals].add(this.group);
        this.stage = stage;
    }

    public drawElements(state: SetupState){

        if (!this.stage || !this.group)
            return;

        this.panel = new SetupPanel(
            this.stage,
            {
                x: 50,
                y: 50,
                width: this.group.width() - 100,
                height: this.group.height() - 100,
            },
            state.specialists,
        );

        this.showHideButton = new ShowHideButton(
            this.stage,
            { x: 550, y: 450 },
            '#002255',
            'Show / Hide',
            () => {
                this.panel && this.panel.switchVisibility();
            },
        );
        this.showHideButton.enable();
        this.group.add(this.panel.getElement(), this.showHideButton.getElement());
    }

    public update(state: SetupState) {
        const { players, specialists } = state;

        this.panel?.update({ players, specialists });
    }

    public disable(): void {
        this.group?.hide();
    }

    public selfDecomission(): null {
        if (!this.group)
            console.warn('SetupGroup cannot be destroyed: Lost reference.');

        this.group?.destroy();
        this.showHideButton = this.showHideButton?.selfDecomission() || null;
        this.panel = this.panel?.selfDecomission() || null; // TODO: continue implementing self boom
        this.stage = null;

        return null;
    }
}