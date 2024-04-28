
export class Service {
    static instance = null;

    static getInstance() {

        if(!this.instance) {
            this.instance = new this();
            console.log(`Instance of ${this.name} created`);
        }

        return this.instance;
    }
}