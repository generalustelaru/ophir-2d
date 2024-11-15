import { EventPayload, EventTitle } from "./client_types";

export class Dispatcher {
    private static instance: Dispatcher|null = null;

    private constructor() {
        // Initialize with dependencies if needed
    }

    public broadcastEvent(
        eventType: EventTitle,
        detail: EventPayload = null
    ): void {
        window.dispatchEvent(
            new CustomEvent(
                eventType,
                { detail: detail }));
    }

    public static getInstance(): Dispatcher {

        if (!this.instance) {
            this.instance = new this();
        }

        return this.instance;
    }
}