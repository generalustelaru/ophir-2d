import {
    ClientRequest,
} from "../../../shared_types";
import { lib, ObjectTests } from "./library"

export class ValidatorService {

    public validateClientRequest(request: object | null): ClientRequest | null {

        const requestTests: ObjectTests = [
            { key: 'clientId', type: 'string', nullable: true },
            { key: 'gameId', type: 'string', nullable: true },
            { key: 'playerName', type: 'string', nullable: true },
            { key: 'playerColor', type: 'string', nullable: true },
            { key: 'message', type: 'object', nullable: false },
        ];

        const messageTests: ObjectTests = [
            { key: 'action', type: 'string', nullable: false },
            { key: 'payload', type: 'object', nullable: true },
        ];

        const requestValidationResults = lib.test(
            { request },
            'request',
            requestTests
        );

        const messageValidationResults = lib.test(
            request,
            'message',
            messageTests
        );

        const errors = lib.getErrors([
            ...requestValidationResults,
            ...messageValidationResults
        ]);

        if (errors.length) {

            errors.forEach(error => {
                console.error(`Validation ERROR: ${error}`);
            });

            return null;
        }

        return request as ClientRequest;
    }
}
