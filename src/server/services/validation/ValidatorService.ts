import {
    ChatPayload,
    ClientRequest,
    RebindClientPayload,
} from "../../../shared_types";
import { lib } from "./library"

export class ValidatorService {

    public validateClientRequest(request: unknown): ClientRequest | null {

        const requestErrors = lib.evaluateObject(
            'ClientRequest',
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
            'ClientMessage',
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
        const errors = lib.evaluateObject(
            'ChatPayload',
            payload,
            [{ key: 'input', type: 'string', nullable: false }],
        );

        if (errors.length){
            this.logErrors(errors);

            return null;
        }

        return payload as ChatPayload;
    }

    public validateRebindClientPayload(payload: object|null): RebindClientPayload | null {
        const errors = lib.evaluateObject(
            'RebindClientPayload',
            payload,
            [
                { key: 'referenceId', type: 'string', nullable: false },
                { key: 'myId', type: 'string', nullable: false },
            ],
        );

        if (errors.length){
            this.logErrors(errors);

            return null;
        }

        return payload as RebindClientPayload;
    }

    private logErrors(errors: Array<string>) {
        console.error('Validation Errors:')
        errors.forEach(error => {
            console.error(error);
        });
    }
}
