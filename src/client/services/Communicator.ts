import { ClientEvent } from "../client_types";

export abstract class Communicator {

    protected createEvent(
        event: ClientEvent
    ): void {
        const { type, detail } = event;
        const eventInitDict = { detail };
        window.dispatchEvent(new CustomEvent(type, eventInitDict));
    }
}
