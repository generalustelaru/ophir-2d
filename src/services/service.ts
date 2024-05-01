import { EventPayload } from "../types";

export interface ServiceStaticInterface {
    new (): ServiceInterface;
    getInstance(): ServiceInterface;
}
export interface ServiceInterface {
    broadcastEvent: (event: string, payload: EventPayload) => void,
}
export class Service implements ServiceInterface {
    static instance: Service | null = null;

    broadcastEvent = (eventType: string, detail: EventPayload = null) => {
        window.dispatchEvent(
            new CustomEvent(
                eventType,
                {detail: detail}
            )
        );
    }

    static getInstance<T extends ServiceInterface>(): T {

        if(!this.instance) {
            this.instance = new this();
            console.log(`Instance of ${this.name} created`);
        }

        return this.instance as T;
    }
}