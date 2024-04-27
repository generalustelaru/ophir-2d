
export class Service {
    static instances = {};

    static getInstance(name) {

        if(!this.instances[name]) {
            this.instances[name] = new this();
        }

        return this.instances[name];
    }
}