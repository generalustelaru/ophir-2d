import {
    ClientRequest,
} from "../../../shared_types";
import { lib, ValidationResponse } from "./library"

export class ValidatorService {

    public validateClientRequest(request: object): ClientRequest | null {

        const clientMessageValidations = ((): Array<ValidationResponse> => {
            const recordTest = lib.hasRecord(request, 'message');

            if (recordTest.passed) {
                const message = request['message' as keyof object] as object;

                const propTests = [
                    lib.hasString(message, 'action'),
                    lib.hasRecord(message, 'payload', true),
                ]

                return propTests;
            }

            return [recordTest];
        })();

        const requestValidations: ValidationResponse[] = [
            lib.hasString(request, 'clientId', true),
            lib.hasString(request, 'gameId', true),
            lib.hasString(request, 'playerName', true),
            lib.hasString(request, 'playerColor', true),
            ...clientMessageValidations
        ];

        const errors = requestValidations
        .filter(v => (!v.passed && v.error))
        .map(validation => validation.error)


        if (errors.length) {
            errors.forEach(error => {
                console.error(`Validation ERROR: ${error}`);

            })

            return null;
        }

        return request as ClientRequest;
    }
}

