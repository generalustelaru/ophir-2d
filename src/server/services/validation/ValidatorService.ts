import { HexCoordinates } from '~/client_types';
import {
    ChatPayload, ClientRequest, GameSetupPayload, MovementPayload, Coordinates, RepositioningPayload, DropItemPayload,
    LoadGoodPayload, MarketSlotPayload, MetalPurchasePayload, MetalDonationPayload, PickSpecialistPayload, State,
    Action, SpecialistName, Phase, EnrolmentPayload, OpponentRepositioningPayload,
} from '~/shared_types';
import { lib, ObjectTests } from './library';
import { BackupState, PrivateState, Probable, SavedSession } from '~/server_types';

const refs = {
    sessionPhase: ['play', 'setup', 'enrolment'],
    playerColor: ['Purple', 'Yellow', 'Red', 'Green'],
    actions: Object.values(Action),
    zoneName: ['center', 'topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft'],
    specialistName: Object.values(SpecialistName),
    tradeGood: ['gems', 'ebony', 'marble', 'linen'],
    marketSlotKey: ['slot_1', 'slot_2', 'slot_3'],
    metal: ['silver', 'gold'],
    currency: ['coins', 'favor'],
    itemName: ['gems', 'ebony', 'marble', 'linen', 'silver', 'gold', 'silver_extra', 'gold_extra', 'empty'],
};
class ValidatorService {

    public validateStateFile(fileContent: unknown) {
        const savedSession = this.validateObject<SavedSession>(
            'SavedSession',
            fileContent,
            [
                { key: 'sharedState', type: 'object', nullable: false },
                { key: 'privateState', type: 'object', nullable: true },
                { key: 'backupState', type: 'object', nullable: true },
            ],
        );

        if (!savedSession)
            return null;

        const sharedState = this.validateObject<State>(
            'State',
            savedSession.sharedState,
            [
                { key: 'gameId', type: 'string', nullable: false },
                { key: 'sessionPhase', type: 'string', nullable: false, ref: refs.sessionPhase },
                { key: 'sessionOwner', type: 'string', nullable: true, ref: refs.playerColor },
                { key: 'players', type: 'array', nullable: false },
                { key: 'chat', type: 'array', nullable: false },
            ],
        );

        if (!sharedState)
            return null;

        if (sharedState.sessionPhase === Phase.play) {

            const privateState = this.validateObject<PrivateState>(
                'PrivateState',
                savedSession.privateState,
                [
                    { key: 'destinationPackages', type: 'array', nullable: false }, // Array<DestinationPackage>;
                    { key: 'tradeDeck', type: 'array', nullable: false }, // Array<Trade>;
                    { key: 'costTiers', type: 'array', nullable: false }, // Array<ExchangeTier>;
                    { key: 'gameStats', type: 'array', nullable: false }, // Array<PlayerCountables>;
                ],
            );

            if (!privateState)
                return null;

            if (savedSession.backupState != null) {
                const backupState = this.validateObject<BackupState>(
                    'BackupState',
                    savedSession.backupState,
                    [
                        { key: 'playState', type: 'object', nullable: false },
                        { key: 'privateState', type: 'object', nullable: false },
                    ],
                );

                if(!backupState)
                    return null;
            }
        }

        return savedSession;
    }

    public validateClientRequest(request: unknown) {
        const clientRequest = this.validateObject<ClientRequest>(
            'ClientRequest',
            request,
            [
                { key: 'socketId', type: 'string', nullable: true },
                { key: 'gameId', type: 'string', nullable: true },
                { key: 'playerName', type: 'string', nullable: true },
                { key: 'playerColor', type: 'string', nullable: true, ref: refs.playerColor },
                { key: 'message', type: 'object', nullable: false },
            ],
        );

        if (!clientRequest)
            return null;

        const message = this.validateObject(
            'ClientMessage',
            clientRequest.message,
            [
                { key: 'action', type: 'string', nullable: false, ref: Object.values(Action) },
                { key: 'payload', type: 'object', nullable: true },
            ],
        );

        if (!message)
            return null;

        return clientRequest;
    }

    public validateEnrolmentPayload(payload: unknown) {
        return this.validateObject<EnrolmentPayload>(
            'EnrolmentPayload',
            payload,
            [
                { key: 'color', type: 'string', nullable: false, ref: refs.playerColor },
                { key: 'name', type: 'string', nullable: true },
            ],
        );
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
            [{ key: 'name', type: 'string', nullable: false, ref: refs.specialistName }],
        );
    }

    public validateMovementPayload(payload: unknown) {
        const movementPayload = this.validateObject<MovementPayload>(
            'MovementPayload',
            payload,
            [
                { key: 'zoneId', type: 'string', nullable: false, ref: refs.zoneName },
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

    public validateOpponentRepositioningPayload(payload: unknown): Probable<OpponentRepositioningPayload> {
        const opponentRepositioningPayload = this.validateObject<OpponentRepositioningPayload>(
            'OpponentRepositioningPayload',
            payload,
            [
                { key: 'color', type: 'string', nullable: false },
                { key: 'repositioning', type: 'object', nullable: false },
            ],
        );

        if (!opponentRepositioningPayload)
            return lib.fail('object structure does not match.');

        if (!this.validateCoordinates(opponentRepositioningPayload.repositioning))
            return lib.fail('repositioning is missing coordinates.');

        return lib.pass(opponentRepositioningPayload);
    }

    public validateGameSetupPayload(payload: unknown) {
        const gameSetupPayload = this.validateObject<GameSetupPayload>(
            'GameSetupPayload',
            payload,
            [
                { key: 'hexPositions', type: 'array', nullable: false },
                { key: 'startingPositions', type: 'array', nullable: false },
            ],
        );

        if (!gameSetupPayload) {
            return null;
        }


        const hexPositions = gameSetupPayload.hexPositions.map(
            value => this.validateObject<HexCoordinates>(
                'HexCoordinates',
                value,
                [
                    { key: 'id', type: 'string', nullable: false, ref: refs.zoneName },
                    { key: 'x', type: 'number', nullable: false },
                    { key: 'y', type: 'number', nullable: false },
                ],
            ),
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
            [{ key: 'tradeGood', type: 'string', nullable: false, ref: refs.tradeGood }],
        );
    }

    public validateMarketSlotPayload(payload: unknown) {
        return this.validateObject<MarketSlotPayload>(
            'MarketSlotPayload',
            payload,
            [
                { key: 'slot', type: 'string', nullable: false, ref: refs.marketSlotKey },
            ],
        );
    }

    public validateMetalPurchasePayload(payload: unknown) {
        return this.validateObject<MetalPurchasePayload>(
            'MetalPurchasePayload',
            payload,
            [
                { key: 'metal', type: 'string', nullable: false, ref: refs.metal },
                { key: 'currency', type: 'string', nullable: false, ref: refs.currency },
            ],
        );
    }

    public validateMetalDonationPayload(payload: unknown) {
        return this.validateObject<MetalDonationPayload>(
            'MetalDonationPayload',
            payload,
            [{ key: 'metal', type: 'string', nullable: false, ref: refs.metal }],
        );
    }

    public validateDropItemPayload(payload: unknown) {
        return this.validateObject<DropItemPayload>(
            'DropItemPayload',
            payload,
            [{ key: 'item', type: 'string', nullable: false, ref: refs.itemName }],
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
        console.error(`[${objectType}] Validation Errors:`);
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
