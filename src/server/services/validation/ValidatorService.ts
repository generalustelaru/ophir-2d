import {
    ChatPayload,
    ClientRequest,
} from "../../../shared_types";
import { lib } from "./library"

export class ValidatorService {

    public validateClientRequest(request: object | null): ClientRequest | null {

        const requestErrors = lib.evaluateObject(
            request,
            [
                { key: 'clientId', type: 'string', nullable: true },
                { key: 'gameId', type: 'string', nullable: true },
                { key: 'playerName', type: 'string', nullable: true },
                { key: 'playerColor', type: 'string', nullable: true },
                { key: 'message', type: 'object', nullable: false },
            ]
        );

        if (requestErrors.length) {
            this.logErrors(requestErrors);

            return null;
        }

        const messageErrors = lib.evaluateObject(
            (request as object)['message' as keyof object],
            [
                { key: 'action', type: 'string', nullable: false },
                { key: 'payload', type: 'object', nullable: true },
            ]
        );

        if (messageErrors.length) {
            this.logErrors(messageErrors);

            return null;
        }

        return request as ClientRequest;
    }

    public validateChatPayload(payload: object|null): ChatPayload | null {
        const digestErrors = lib.evaluateObject(
            payload,
            [{ key: 'input', type: 'string', nullable: false }],
        );

        if (digestErrors.length){
            this.logErrors(digestErrors);

            return null;
        }

        return payload as ChatPayload;
    }

    private logErrors(errors: Array<string>) {
        console.error('Validation Errors:')
        errors.forEach(error => {
            console.error(error);
        });
    }
}
