import Konva from 'konva';
import { GroupLayoutData } from '../client_types';
import { ClientMessage } from '../../shared_types';
export abstract class ActionButton {
    protected group: Konva.Group;
    private stage: Konva.Stage;
    private message: ClientMessage | null;
    private isActive: boolean = false;

    constructor(stage: Konva.Stage, layout: GroupLayoutData, actionMessage: ClientMessage | null) {
        this.stage = stage;
        this.message = actionMessage;

        this.group = new Konva.Group(layout);

        if (!actionMessage) {
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
                        { detail: this.message }
                ));
                this.stage.container().style.cursor = 'none';
            }
        });
    }

    public updateActionPayload(payload: ClientMessage): void {
        this.message = payload;
    }

    protected setEnabled(isEnabled: boolean): void {
        this.isActive = isEnabled;
    }

    public disableAction(): void {
        this.setEnabled(false);
    }
}
