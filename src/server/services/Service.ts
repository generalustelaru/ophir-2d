
export class Service {
    private static instance: Service|null = null;

    public static getInstance<I>(): I {

        if (!this.instance) {
            this.instance = new this();
        }

        return this.instance as I;
    }
}
