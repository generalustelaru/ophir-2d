import Konva from 'konva';
import { GroupLayoutData, EventType } from '~/client_types';
import { ClientMessage } from '~/shared_types';
import { Button } from './Button';

export abstract class RequestButton extends Button {

    constructor(stage: Konva.Stage, layout: GroupLayoutData, actionMessage: ClientMessage | null) {
        super(
            stage,
            layout,
            (
                actionMessage ? () => window.dispatchEvent(new CustomEvent(
                    EventType.action,
                    { detail: actionMessage },
                )): null
            ),
        );
    }

    public setEnabled(shouldEnable: boolean) {
        shouldEnable ? this.enable() : this.disable();
    }

    public updateActionMessage(actionMessage: ClientMessage) {
        this.updateFunction(
            () => window.dispatchEvent(new CustomEvent(
                'action',
                { detail: actionMessage },
            )),
        );
    }
}
