import Konva from 'konva';
import { ActionEventPayload, GroupLayoutData } from '../client_types';
export class ResponsiveGroup {
    protected group: Konva.Group;
    private stage: Konva.Stage;
    private payload: ActionEventPayload | null;
    private isActive: boolean = false;

    constructor(stage: Konva.Stage, layout: GroupLayoutData, actionPayload: ActionEventPayload | null) {
        this.stage = stage;
        this.payload = actionPayload;
        const layer = stage.getLayers()[0];

        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        layer.add(this.group);

        if (!actionPayload) {
            return;
        }

        this.group.on('mouseenter', () => {
            this.stage.container().style.cursor = this.isActive ? 'pointer' : 'not-allowed';
        });

        this.group.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });

        this.group.on('click', () => {

            if (this.isActive) {
                window.dispatchEvent(new CustomEvent(
                        'action',
                        { detail: this.payload }
                ));
            }
        });
    }

    public updateActionPayload(payload: ActionEventPayload): void {
        this.payload = payload;
    }

    protected setEnabled(isEnabled: boolean): void {
        this.isActive = isEnabled;
    }
}
