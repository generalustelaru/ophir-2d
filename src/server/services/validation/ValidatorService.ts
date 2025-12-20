import { HexCoordinates } from '~/client_types';
import {
    ChatPayload, ClientRequest, GameSetupPayload, MovementPayload, Coordinates, RepositioningPayload, DropItemPayload,
    LoadGoodPayload, MarketSalePayload, MetalPurchasePayload, MetalDonationPayload, PickSpecialistPayload, State,
    Action, SpecialistName, Phase, OpponentRepositioningPayload, ColorSelectionPayload,
    ChancellorMarketSalePayload,
    PeddlerMarketPayload,
} from '~/shared_types';
import { lib, ObjectTests } from './library';
import { BackupState, Configuration, PrivateState, Probable, GameState, User } from '~/server_types';

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

    public validateConfiguration(db_data: unknown): Configuration | null {
        const config = this.validateObject<Configuration>(
            'Configuration',
            db_data,
            [
                { key: 'SERVER_NAME', type: 'string', nullable: false },
                { key: 'PLAYER_IDLE_MINUTES', type: 'number', nullable: false },
                { key: 'GAME_PERSIST_HOURS', type: 'number', nullable: false },
                { key: 'SINGLE_PLAYER', type: 'boolean', nullable: false },
                { key: 'NO_RIVAL', type: 'boolean', nullable: false },
                { key: 'RICH_PLAYERS', type: 'boolean', nullable: false },
                { key: 'FAVORED_PLAYERS', type: 'boolean', nullable: false },
                { key: 'CARGO_BONUS', type: 'number', nullable: false, ref: [0,1,2,3] },
                { key: 'SHORT_GAME', type: 'boolean', nullable: false },
                { key: 'INCLUDE', type: 'array', nullable: false },
            ],
        );

        if (!config)
            return null;

        const includeTest = lib.evaluateArray(
            'INCLUDE',
            config.INCLUDE,
            'string',
            refs.specialistName,
        );

        if (includeTest.passed)
            return config;

        return null;
    }
    public validateState(db_data: unknown) {
        const savedSession = this.validateObject<GameState>(
            'SavedSession',
            db_data,
            [
                { key: 'sharedState', type: 'object', nullable: false },
                { key: 'privateState', type: 'object', nullable: true },
                { key: 'backupStates', type: 'array', nullable: true },
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
                    { key: 'playerSpentActions', type: 'array', 'nullable': false }, // Array<LocalAction>
                ],
            );

            if (!privateState)
                return null;

            if (savedSession.backupStates != null) {
                const backupStates = savedSession.backupStates.map((state) => {
                    return this.validateObject<BackupState>(
                        'BackupState',
                        state,
                        [
                            { key: 'playState', type: 'object', nullable: false },
                            { key: 'privateState', type: 'object', nullable: false },
                        ],
                    );
                });

                if (backupStates.includes(null))
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

    public validateColorSelectionPayload(payload: unknown) {
        return this.validateObject<ColorSelectionPayload>(
            'ColorChangePayload',
            payload,
            [
                { key: 'color', type: 'string', nullable: false, ref: refs.playerColor },
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

    public validateMarketPayload(payload: unknown) {
        return this.validateObject<MarketSalePayload>(
            'MarketSalePayload',
            payload,
            [
                { key: 'slot', type: 'string', nullable: false, ref: refs.marketSlotKey },
            ],
        );
    }

    public validateChancellorPayload(payload: unknown) {
        const chancellorPayload = this.validateObject<ChancellorMarketSalePayload>(
            'ChancellorMarketSalePayload',
            payload,
            [
                { key: 'slot', type: 'string', nullable: false, ref: refs.marketSlotKey },
                { key: 'omit', type: 'array', nullable: false }, //TODO: add refs to array maybe?
            ],
        );

        if (!chancellorPayload)
            return null;

        const isTradeGoods = chancellorPayload.omit.every(item => { //instead of this
            return refs.tradeGood.includes(item);},
        );

        if (!isTradeGoods)
            return null;

        return chancellorPayload;
    }

    public validatePeddlerPayload(payload: unknown) {
        const peddlerPayload = this.validateObject<PeddlerMarketPayload>(
            'PeddlerMarketPayload',
            payload,
            [{ key: 'omit', type: 'string', nullable: false, ref: refs.tradeGood }],
        );

        return peddlerPayload;
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
