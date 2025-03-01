import {
    ClientRequest,
} from "../../../shared_types";
import { lib, ValidationResult } from "./library"

export class ValidatorService {

    public validateClientRequest(request: object): ClientRequest | null {

        const clientMessageResults = ((): Array<ValidationResult> => {
            const keyTestResult = lib.hasRecord(request, 'message');

            if (keyTestResult.passed) {
                const message = request['message' as keyof object] as object;

                const propTestResults = [
                    lib.hasString(message, 'action'),
                    lib.hasRecord(message, 'payload', true),
                ]

                return propTestResults;
            }

            return [keyTestResult];
        })();

        const results: Array<ValidationResult> = [
            lib.hasString(request, 'clientId', true),
            lib.hasString(request, 'gameId', true),
            lib.hasString(request, 'playerName', true),
            lib.hasString(request, 'playerColor', true),
            ...clientMessageResults,
        ];

        const errors = results
        .filter(v => (!v.passed && v.error))
        .map(validation => validation.error);

        if (errors.length) {

            errors.forEach(error => {
                console.error(`Validation ERROR: ${error}`);
            });

            return null;
        }

        return request as ClientRequest;
    }
}

