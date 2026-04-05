import Konva from 'konva';
import { GroupLayoutData, EventType, EventKey } from '~/client_types';
import { ClientMessage } from '~/shared_types';
import { Button } from './Button';

export abstract class RequestButton extends Button {

    constructor(stage: Konva.Stage, layout: GroupLayoutData, actionMessage: ClientMessage | null) {
        super(
            stage,
            layout,
            (
                actionMessage ? () => window.dispatchEvent(new CustomEvent(
                    EventType.client,
                    { detail: { key: EventKey.client_message, message: actionMessage } },
                )): null
            ),
        );
    }

    public setEnabled(shouldEnable: boolean) {
        shouldEnable ? super.enable() : super.disable();
    }

    public updateActionMessage(cleintMessage: ClientMessage) {
        this.updateFunction(
            () => window.dispatchEvent(new CustomEvent(
                EventType.client,
                { detail: { key: EventKey.client_message, message: cleintMessage } },
            )),
        );
    }
}
