import Konva from 'konva';
import { GroupLayoutData } from "~/client_types";
import { ClientMessage } from "~/shared_types";
import { Button } from './Button';
export abstract class ActionButton extends Button {

    constructor(stage: Konva.Stage, layout: GroupLayoutData, actionMessage: ClientMessage | null) {
        super(
            stage,
            layout,
            () => window.dispatchEvent(new CustomEvent(
                'action',
                { detail: actionMessage }
            )),
        );
    }

    public setEnabled(shouldEnable: boolean) {
        shouldEnable ? this.enable() : this.disable();
    }

    public disableAction(): void {
        this.disable();
    }
}
