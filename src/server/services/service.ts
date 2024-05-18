
export interface ServiceStaticInterface {
    new(): ServiceInterface;
    getInstance(): ServiceInterface;
}

export interface ServiceInterface { }

export class Service {
    static instance: Service | null = null;

    public static getInstance<I extends ServiceInterface>(): I {

        if (!this.instance) {
            this.instance = new this();
        }

        return this.instance as I;
    }
}
