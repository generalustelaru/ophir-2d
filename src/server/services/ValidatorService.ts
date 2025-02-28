import {
    ClientRequest,
} from "../../shared_types";

export class ValidatorService {
    private error: string

    constructor(){
        this.error = '';
    }

    public validateClientRequest(request: object): ClientRequest | null {

        if (
            this.hasString(request, 'clientId', true)
            && this.hasString(request, 'gameId', true)
            && this.hasString(request, 'playerName', true)
            && this.hasString(request, 'playerColor', true)
            && this.hasMessageInterface(request)
        ) {
            return request as ClientRequest;
        }

        console.error(this.error);
        this.setError();

        return null;
    }

    private setError(text?: string) {
        this.error = `VALIDATION ERROR; ${text}` || '';
    }

    private hasMessageInterface(parent: object) {

        if (this.hasRecord(parent, 'message')) {
            const message = parent['message' as keyof object] as object;

            if (
                this.hasString(message, 'action')
                && this.hasRecord(message, 'payload', true)
            )

            return true;
        }

        return false;
    }

    private hasString(parent: object, key: string, nullable: boolean = false): boolean {

        if (this.hasKey(parent, key)) {
            const prop = parent[key as keyof object] as unknown;

            if (nullable && prop === null)
                return true;

            if (typeof prop === 'string' && prop.length)
                return true;

            this.setError(`${key} property is not a valid string: ${prop}`);
        }

        return false;
    }

    private hasRecord(parent: object, key: string, nullable: boolean = false): boolean {

        if (this.hasKey(parent, key)) {
            const prop = parent[key as keyof object] as unknown;

            if (nullable && prop === null)
                return true;

            if (
                typeof prop === 'object'
                && prop !== null
                && Object.keys(prop).length
            )
                return true;

            this.setError(`${key} property is not a valid object: ${prop}`);
        }

        return false;
    }

    private hasKey(parent: object, key: string) {

        if (parent !== null && key in parent)
            return true;

        this.setError(`"${key}" property is missing: ${parent}`);

        return false;
    }
}
