import { EventPayload, CustomEventTitle } from "../client_types";

export interface ServiceStaticInterface {
    new(): ServiceInterface;
    getInstance(deps :any[]): ServiceInterface;
}
export interface ServiceInterface {
    broadcastEvent: (event: CustomEventTitle, payload: EventPayload) => void,
}
export class Service implements ServiceInterface {
    static instance: Service | null = null;

    constructor(...deps: any[]) {
        // Initialize with dependencies if needed
    }

    public broadcastEvent = (
        eventType: CustomEventTitle,
        detail: EventPayload = null
    ): void => {
        window.dispatchEvent(new CustomEvent(eventType, { detail: detail }));
    }

    public static getInstance<I extends ServiceInterface>(deps: any[]): I {

        if (!this.instance) {
            this.instance = new this(...deps);
        }

        return this.instance as I;
    }
}