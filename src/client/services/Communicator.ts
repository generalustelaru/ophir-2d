import { Event } from "../client_types";

export abstract class Communicator {

    protected createEvent(
        event: Event
    ): void {
        const { type, detail } = event;
        const eventInitDict = { detail };
        window.dispatchEvent(new CustomEvent(type, eventInitDict));
    }
}
