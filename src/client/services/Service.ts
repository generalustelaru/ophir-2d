import { ClientEvent } from "../client_types";

export class Service {
    static instance: Service|null = null;

    // @ts-ignore
    constructor(...deps: Array<T>) {
        // Initialize with dependencies if needed
    }

    protected broadcastEvent(
        event: ClientEvent
    ): void {
        const { type, detail } = event;
        const eventInitDict = { detail };
        window.dispatchEvent(new CustomEvent(type, eventInitDict));
    }

    public static getInstance<T,I>(deps: Array<T>): I {

        if (!this.instance) {
            this.instance = new this(...deps);
        }

        return this.instance as I;
    }
}