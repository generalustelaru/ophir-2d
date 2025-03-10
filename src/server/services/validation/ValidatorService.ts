import {
    ChatPayload,
    ClientRequest,
    RebindClientPayload,
    GameSetupPayload,
    MovementPayload,
    Coordinates,
    RepositioningPayload,
    DropItemPayload,
    LoadGoodPayload,
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

    public validateChatPayload(payload: object | null): ChatPayload | null {
        const errors = lib.evaluateObject(
            'ChatPayload',
            payload,
            [{ key: 'input', type: 'string', nullable: false }],
        );

        if (errors.length) {
            this.logErrors(errors);

            return null;
        }

        return payload as ChatPayload;
    }

    public validateRebindClientPayload(payload: object | null): RebindClientPayload | null {
        const errors = lib.evaluateObject(
            'RebindClientPayload',
            payload,
            [
                { key: 'referenceId', type: 'string', nullable: false },
                { key: 'myId', type: 'string', nullable: false },
            ],
        );

        if (errors.length) {
            this.logErrors(errors);

            return null;
        }

        return payload as RebindClientPayload;
    }

    public validateMovementPayload(payload: object | null): MovementPayload | null {
        const payloadErrors = lib.evaluateObject(
            'MovementPayload',
            payload,
            [
                { key: 'hexId', type: 'string', nullable: false },
                { key: 'position', type: 'object', nullable: false },
            ],
        );

        if (payloadErrors.length) {
            this.logErrors(payloadErrors);

            return null;
        }

        const movementPayload = payload as MovementPayload;
        const position = this.validateCoordinates(movementPayload.position);

        if (!position)
            return null;

        return movementPayload;
    }

    public validateRepositioningPayload(payload: object | null): RepositioningPayload | null {
        const payloadErrors = lib.evaluateObject(
            'RepositioningPayload',
            payload,
            [{ key: 'repositioning', type: 'object', nullable: false }],
        );

        if (payloadErrors.length) {
            this.logErrors(payloadErrors);

            return null;
        }

        const repositioningPayload = payload as RepositioningPayload;

        if (!this.validateCoordinates(repositioningPayload.repositioning)) {
            return null;
        }

        return repositioningPayload;
    }

    public validateGameSetupPayload(payload: object | null): GameSetupPayload | null {
        const gameSetupPayloadErrors = lib.evaluateObject(
            'GameSetupPayload',
            payload,
            [
                { key: 'setupCoordinates', type: 'array', nullable: false }
            ],
        )

        if (gameSetupPayloadErrors.length) {
            this.logErrors(gameSetupPayloadErrors);

            return null;
        }

        const gameSetupPayload = payload as GameSetupPayload

        const coordinatesAreValid = gameSetupPayload.setupCoordinates
            .every(value => !!this.validateCoordinates(value));

        if (!coordinatesAreValid)
            return null;

        return gameSetupPayload;
    }

    public validateLoadGoodPayload(payload: object | null): LoadGoodPayload | null {
        const loadGoodPayloadErrors = lib.evaluateObject(
            'LoadGoodPayload',
            payload,
            [{ key: 'tradeGood', type: 'string', nullable: false }],
        );

        if (loadGoodPayloadErrors.length) {
            this.logErrors(loadGoodPayloadErrors);

            return null;
        }

        return payload as LoadGoodPayload;
    }

    public validateDropItemPayload(payload: object | null): DropItemPayload | null {
        const dropItemPayloadErrors = lib.evaluateObject(
            'DropItemPayload',
            payload,
            [{ key: 'item', type: 'string', nullable: false }],
        );

        if (dropItemPayloadErrors.length) {
            this.logErrors(dropItemPayloadErrors);

            return null;
        }

        return payload as DropItemPayload;
    }

    // MARK: PRIVATE
    private validateCoordinates(value: unknown): Coordinates | null {
        const errors = lib.evaluateObject(
            'Coordinates',
            value,
            [
                { key: 'x', type: 'number', nullable: false },
                { key: 'y', type: 'number', nullable: false },
            ],
        );

        if (errors.length) {
            this.logErrors(errors);

            return null;
        }

        return value as Coordinates;
    }

    // MARK: UTILITY
    private logErrors(errors: Array<string>) {
        console.error('Validation Errors:')
        errors.forEach(error => {
            console.error(error);
        });
    }
}
