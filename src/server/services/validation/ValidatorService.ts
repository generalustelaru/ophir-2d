import { HexCoordinates } from "../../../client/client_types";
import {
    ChatPayload,
    ClientRequest,
    GameSetupPayload,
    MovementPayload,
    Coordinates,
    RepositioningPayload,
    DropItemPayload,
    LoadGoodPayload,
    TradePayload,
    MetalPurchasePayload,
    MetalDonationPayload,
    PickSpecialistPayload,
} from "../../../shared_types";
import { lib, ObjectTests } from "./library"

class ValidatorService {

    public validateClientRequest(request: unknown) {
        const clientRequest = this.validateObject<ClientRequest>(
            'ClientRequest',
            request,
            [
                { key: 'socketId', type: 'string', nullable: true },
                { key: 'gameId', type: 'string', nullable: true },
                { key: 'playerName', type: 'string', nullable: true },
                { key: 'playerColor', type: 'string', nullable: true },
                { key: 'message', type: 'object', nullable: false },
            ]
        );

        if (!clientRequest)
            return null;

        const message = this.validateObject(
            'ClientMessage',
            clientRequest.message,
            [
                { key: 'action', type: 'string', nullable: false },
                { key: 'payload', type: 'object', nullable: true },
            ]
        );

        if (!message)
            return null;

        return clientRequest;
    }

    public validateChatPayload(payload: unknown) {
        return this.validateObject<ChatPayload>(
            'ChatPayload',
            payload,
            [{ key: 'input', type: 'string', nullable: false }],
        );
    }

    public validatePickSpecialistPayload(payload: unknown) {
        return this.validateObject<PickSpecialistPayload>(
            'PickSpecialistayload',
            payload,
            [{ key: 'name', type: 'string', nullable: false }],
        )
    }

    public validateMovementPayload(payload: unknown) {
        const movementPayload = this.validateObject<MovementPayload>(
            'MovementPayload',
            payload,
            [
                { key: 'zoneId', type: 'string', nullable: false },
                { key: 'position', type: 'object', nullable: false },
            ],
        );

        if (
            !movementPayload
            || !this.validateCoordinates(movementPayload.position)
        )
            return null;

        return movementPayload;
    }

    public validateRepositioningPayload(payload: unknown) {
        const repositioningPayload = this.validateObject<RepositioningPayload>(
            'RepositioningPayload',
            payload,
            [{ key: 'repositioning', type: 'object', nullable: false }],
        );

        if (
            !repositioningPayload
            || !this.validateCoordinates(repositioningPayload.repositioning)
        ) {
            return null;
        }

        return repositioningPayload;
    }

    public validateGameSetupPayload(payload: unknown) {
        const gameSetupPayload = this.validateObject<GameSetupPayload>(
            'GameSetupPayload',
            payload,
            [
                { key: 'hexPositions', type: 'array', nullable: false },
                { key: 'startingPositions', type: 'array', nullable: false },
            ],
        )

        if (!gameSetupPayload) {
            return null;
        }


        const hexPositions = gameSetupPayload.hexPositions.map(
            value => this.validateObject<HexCoordinates>(
                'HexCoordinates',
                value,
                [
                    {key: 'id', type: 'string', nullable: false},
                    {key: 'x', type: 'number', nullable: false},
                    {key: 'y', type: 'number', nullable: false},
                ],
            )
        );

        const startingPositionsAreValid = gameSetupPayload.startingPositions
            .every(value => !!this.validateCoordinates(value));

        if (
            !startingPositionsAreValid
            || hexPositions.includes(null)
        )
            return null;

        return gameSetupPayload;
    }

    public validateLoadGoodPayload(payload: unknown) {
        return this.validateObject<LoadGoodPayload>(
            'LoadGoodPayload',
            payload,
            [{ key: 'tradeGood', type: 'string', nullable: false }],
        );
    }

    public validateTradePayload(payload: unknown) {
        return this.validateObject<TradePayload>(
            'TradePayload',
            payload,
            [
                { key: 'slot', type: 'string', nullable: false },
                { key: 'location', type: 'string', nullable: false },
            ],
        );
    }

    public validateMetalPurchasePayload(payload: unknown) {
        return this.validateObject<MetalPurchasePayload>(
            'MetalPurchasePayload',
            payload,
            [
                { key: 'metal', type: 'string', nullable: false },
                { key: 'currency', type: 'string', nullable: false },
            ],
        );
    }

    public validateMetalDonationPayload(payload: unknown) {
        return this.validateObject<MetalDonationPayload>(
            'MetalDonationPayload',
            payload,
            [{ key: 'metal', type: 'string', nullable: false }],
        );
    }

    public validateDropItemPayload(payload: unknown) {
        return this.validateObject<DropItemPayload>(
            'DropItemPayload',
            payload,
            [{ key: 'item', type: 'string', nullable: false }],
        );
    }

    // MARK: PRIVATE
    private validateCoordinates(value: unknown) {
        return this.validateObject<Coordinates>(
            'Coordinates',
            value,
            [
                { key: 'x', type: 'number', nullable: false },
                { key: 'y', type: 'number', nullable: false },
            ],
        );
    }

    // MARK: UTILITY
    private logErrors(objectType: string, errors: Array<string>) {
        console.error(`[${objectType}] Validation Errors:`)
        errors.forEach(error => {
            console.error(error);
        });
    }

    /**
     * @description Wrapper over `evaluateObject`, also logs errors.
     * @param objectType Only for errror logging
     * @returns typed object or `null`
     */
    private validateObject<T>(objectType: string, value: unknown, tests: ObjectTests) {
        const errors = lib.evaluateObject(objectType, value, tests);

        if (errors.length) {
            this.logErrors(objectType, errors);

            return null;
        }

        return value as T;
    }
}

export const validator = new ValidatorService();
