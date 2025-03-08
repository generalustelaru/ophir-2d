import { ClientEvent } from "../client_types";

export abstract class Communicator {

    protected broadcastEvent(
        event: ClientEvent
    ): void {
        const { type, detail } = event;
        const eventInitDict = { detail };
        window.dispatchEvent(new CustomEvent(type, eventInitDict));
    }
}
