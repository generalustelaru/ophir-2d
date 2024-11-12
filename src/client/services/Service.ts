import { EventPayload, EventTitle } from "../client_types";

export class Service {
    static instance: Service|null = null;

    // @ts-ignore
    constructor(...deps: Array<T>) {
        // Initialize with dependencies if needed
    }

    public broadcastEvent(
        eventType: EventTitle,
        detail: EventPayload = null
    ): void {
        window.dispatchEvent(new CustomEvent(eventType, { detail: detail }));
    }

    public static getInstance<T,I>(deps: Array<T>): I {

        if (!this.instance) {
            this.instance = new this(...deps);
        }

        return this.instance as I;
    }
}