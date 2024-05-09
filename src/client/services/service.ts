import { EventPayload, CustomEventTitle } from "../client_types";

export interface ServiceStaticInterface {
    new (): ServiceInterface;
    getInstance(): ServiceInterface;
}
export interface ServiceInterface {
    broadcastEvent: (event: CustomEventTitle, payload: EventPayload) => void,
}
export class Service implements ServiceInterface {
    static instance: Service | null = null;

    public broadcastEvent = (
        eventType: CustomEventTitle,
        detail: EventPayload = null
    ): void => {
        window.dispatchEvent(new CustomEvent(eventType, { detail: detail }));
    }

    public static getInstance<I extends ServiceInterface>(): I {

        if(!this.instance) {
            this.instance = new this();
        }

        return this.instance as I;
    }
}