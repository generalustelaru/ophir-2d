import { EventPayload, EventTitle } from "../client_types";

export interface ServiceStaticInterface {
    new(): ServiceInterface;
    getInstance(deps : Array<any>): ServiceInterface;
}
export interface ServiceInterface {
    broadcastEvent(event: EventTitle, payload: EventPayload): void,
}
export class Service implements ServiceInterface {
    static instance: Service|null = null;

    // @ts-ignore
    constructor(...deps: Array<any>) {
        // Initialize with dependencies if needed
    }

    public broadcastEvent(
        eventType: EventTitle,
        detail: EventPayload = null
    ): void {
        window.dispatchEvent(new CustomEvent(eventType, { detail: detail }));
    }

    public static getInstance<I extends ServiceInterface>(deps: Array<any>): I {

        if (!this.instance) {
            this.instance = new this(...deps);
        }

        return this.instance as I;
    }
}