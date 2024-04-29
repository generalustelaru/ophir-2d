import { ServiceInterface } from "../types";

export class Service implements ServiceInterface {
    static instance: Service | null = null;

    static getInstance<T extends ServiceInterface>(): T {

        if(!this.instance) {
            this.instance = new this();
            console.log(`Instance of ${this.name} created`);
        }

        return this.instance as T;
    }
}