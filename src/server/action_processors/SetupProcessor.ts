import {
    BarrierId, Coordinates, Player, PlayerColor, MarketFluctuations, Trade, MarketOffer, MarketSlotKey, LocationData,
    Fluctuation, ExchangeTier, PlayerEntry, Rival, GameSetupPayload, Phase, PlayerDraft, MapPairings, LocationName,
    ZoneName, PlayerSelection, SpecialistName, StateResponse, SpecialistData, SelectableSpecialist, ChatEntry,
    PlayerEntity,
} from '~/shared_types';
import { DestinationPackage, StateBundle, SetupDigest, SessionProcessor } from '~/server_types';
import serverConstants from '~/server_constants';
import tools from '../services/ToolService';
import { PlayStateHandler } from '../state_handlers/PlayStateHandler';
import {
    SERVER_NAME, SINGLE_PLAYER, CARGO_BONUS, RICH_PLAYERS, FAVORED_PLAYERS, SHORT_GAME, IDLE_CHECKS, PERSIST_SESSION,
    INCLUDE,
} from '../configuration';
import { PrivateStateHandler } from '../state_handlers/PrivateStateHandler';
import { BackupStateHandler } from '../state_handlers/BackupStateHandler';
import { SetupStateHandler } from '../state_handlers/SetupStateHandler';
import { HexCoordinates } from '~/client_types';
import { validator } from '../services/validation/ValidatorService';
import lib, { Probable } from './library';

// @ts-ignore
const activeKeys = Object.entries({ SINGLE_PLAYER, CARGO_BONUS, RICH_PLAYERS, FAVORED_PLAYERS, SHORT_GAME, IDLE_CHECKS, PERSIST_SESSION, INCLUDE }).reduce((acc, [k, v]) => { if (v) acc[k] = v; return acc; }, {}); // eslint-disable-line max-len
console.log('Active keys:');
console.log(activeKeys);

const {
    BARRIER_CHECKS, DEFAULT_MOVE_RULES, TRADE_DECK_A, TRADE_DECK_B, COST_TIERS, LOCATION_ACTIONS, SPECIALISTS,
} = serverConstants;

export class SetupProcessor implements SessionProcessor {

    private setupState: SetupStateHandler;

    constructor(digest: SetupDigest) {

        const playerEntries = tools.getCopy(digest.players);
        const playerCount = playerEntries.length;

        if (playerCount < 2 && !SINGLE_PLAYER)
            throw new Error('Not enough players to start a game.');

        const barriers = this.determineBarriers();
        const mapPairings = this.determineLocations();

        const specialists = ((): Array<SelectableSpecialist> => {
            const deck = tools.getCopy(SPECIALISTS);

            if (playerCount >= deck.length)
                throw new Error('Not enough specialist cards!');

            const randomized: Array<SpecialistData> = lib.randomize(deck);
            const selection = randomized.slice(0, playerCount + 1);

            if (INCLUDE.length) {
                const toInclude = INCLUDE.reverse();
                for (const includeeName of toInclude) {
                    if (selection.find(s => s.name === includeeName))
                        break;

                    const specialist = deck.find(s => s.name === includeeName);

                    if (specialist)
                        selection.push(specialist);
                }

                while (selection.length > playerCount + 1)
                    selection.shift();
            }

            return selection.map(s => { return { ...s, owner: null }; });
        })();

        const playerDrafts = this.draftPlayers(playerEntries);
        this.setupState = new SetupStateHandler(
            SERVER_NAME,
            {
                gameId: digest.gameId,
                sessionPhase: Phase.setup,
                sessionOwner: digest.sessionOwner,
                players: playerDrafts,
                specialists,
                setup: {
                    barriers,
                    mapPairings,
                },
                chat: digest.chat,
            });

        const firstToPick = playerDrafts.find(p => p.turnToPick);

        if (!firstToPick)
            throw new Error('No player is set to pick specialist!');

        this.setupState.addServerMessage(`[${firstToPick.name}] is picking a specialist.`, firstToPick.color);
    };

    public getState() {
        return this.setupState.toDto();
    }

    public addChat(entry: ChatEntry): StateResponse {
        this.setupState.addChatEntry(entry);

        return { state: this.getState() };
    }

    public updatePlayerName(player: PlayerEntity, newName: string): StateResponse {
        this.setupState.addServerMessage(`[${player.name}] is henceforth known as [${newName}]`, player.color);
        this.setupState.updateName(player.color, newName);

        return { state: this.getState() };
    };
    //#MARK: Specialist
    public processSpecialistSelection(player: PlayerDraft, payload: unknown): Probable<StateResponse> {
        const specialistPayload = validator.validatePickSpecialistPayload(payload);

        if (!specialistPayload)
            return lib.fail(lib.validationErrorMessage());

        const { name } = specialistPayload;
        const pickedSpecialist = this.setupState.getSpecialist(name);

        if (!pickedSpecialist)
            return lib.fail('Cannot find named specialist!');

        if (!player.turnToPick || player.specialist || pickedSpecialist.owner)
            return lib.fail('Player cannot choose or specialist already assigned');

        this.setupState.assignSpecialist(player, name);
        this.setupState.addServerMessage(
            `[${player.name}] has picked the ${pickedSpecialist.displayName}`, player.color,
        );
        const nextPlayer = this.setupState.getNextPlayer();

        if (nextPlayer)
            this.setupState.addServerMessage(`[${nextPlayer.name}] is picking a specialist.`, nextPlayer.color);

        return lib.pass({ state: this.setupState.toDto() });
    }

    /**
     * @param clientSetupPayload Coordinates are required for unified ship token placement acrosss clients.
     * @returns `{playState, privateState}`  Used expressily for a game session instance.
     */
    public processStart(
        clientSetupPayload: GameSetupPayload,
    ): Probable<StateBundle> {

        const setupState = this.setupState.toDto();

        const playerSelections = ((): Array<PlayerSelection> | null => {
            const drafts = setupState.players;
            const selections = [];

            for (let i = 0; i < drafts.length; i++) {
                const { socketId, color, name, turnOrder, specialist } = drafts[i];

                if (!specialist)
                    return null;

                selections.push({ socketId, color, name, turnOrder, specialist });
            };

            return selections;
        })();

        if (!playerSelections)
            return lib.fail('Specialist selection is incomplete');

        const marketData = this.prepareDeckAndGetOffer();
        const privateStateHandler = new PrivateStateHandler({
            destinationPackages: this.produceMoveRules(setupState.setup.barriers),
            tradeDeck: marketData.tradeDeck,
            costTiers: this.filterCostTiers(playerSelections.length),
            gameStats: playerSelections.map(p => (
                { color: p.color, vp: 0, gold: 0, silver: 0, favor: 0, coins: 0 }
            )),
        });

        const { players, startingPlayerColor } = this.hydratePlayers(
            playerSelections,
            privateStateHandler.getDestinationPackages(),
            clientSetupPayload.startingPositions,
            setupState.setup.mapPairings,
        );

        const playStateHandler = new PlayStateHandler(
            SERVER_NAME,
            {
                gameId: setupState.gameId,
                sessionPhase: Phase.play,
                hasGameEnded: false,
                gameResults: [],
                sessionOwner: setupState.sessionOwner,
                chat: setupState.chat,
                players,
                market: marketData.marketOffer,
                itemSupplies: this.getItemSupplies(players),
                temple: {
                    maxLevel: privateStateHandler.getTempleLevelCount(),
                    treasury: privateStateHandler.drawMetalPrices()!,
                    levelCompletion: 0,
                    currentLevel: SHORT_GAME ? privateStateHandler.getTempleLevelCount() - 1 : 0,
                    donations: [],
                },
                setup: {
                    barriers: setupState.setup.barriers,
                    mapPairings: setupState.setup.mapPairings,
                    marketFluctuations: this.getMarketFluctuations(),
                    templeTradeSlot: this.determineTempleTradeSlot(),
                },
                rival: this.getRivalShipData(
                    Boolean(playerSelections.length < 3),
                    clientSetupPayload.hexPositions,
                    setupState.setup.mapPairings,
                    startingPlayerColor,
                    privateStateHandler.getDestinationPackages(),
                ),
            });
        playStateHandler.addServerMessage('Game started!');

        return lib.pass({
            playState: playStateHandler,
            privateState: privateStateHandler,
            backupState: new BackupStateHandler(SERVER_NAME, null),
        });
    };

    // MARK: Map
    private determineBarriers(): Array<BarrierId> {

        function newBarrierId(): BarrierId {
            return Math.ceil(Math.random() * 12) as BarrierId;
        }

        const b1 = newBarrierId();

        const b2 = ((): BarrierId => {
            const incompatibles = BARRIER_CHECKS[b1].incompatible;
            let b;

            do {
                b = newBarrierId();
            } while (incompatibles.includes(b));

            return b;
        })();

        return [b1, b2];
    }

    private determineLocations(): MapPairings {
        const locations = lib.randomize(LOCATION_ACTIONS);

        if (locations.length !== 7) {
            throw new Error(`Invalid number of locations! Expected 7, got {${locations.length}}`);
        }

        function drawLocation(): LocationData {
            return locations.shift() as LocationData;
        }

        const locationByZone = {
            center: drawLocation(),
            topRight: drawLocation(),
            right: drawLocation(),
            bottomRight: drawLocation(),
            bottomLeft: drawLocation(),
            left: drawLocation(),
            topLeft: drawLocation(),
        };

        const zoneByLocation = Object.fromEntries(
            Object.entries(locationByZone)
                .map(([zoneName, locationData]) => [locationData.name, zoneName]),
        ) as Record<LocationName, ZoneName>;

        return { locationByZone, zoneByLocation };
    }

    private produceMoveRules(barrierIds: Array<BarrierId>): Array<DestinationPackage> {

        return tools.getCopy(DEFAULT_MOVE_RULES).map(moveRule => {
            const navigatorAccess: Array<ZoneName> = [];

            barrierIds.forEach(barrierId => {

                if (moveRule.blockedBy.find(id => id === barrierId)) {
                    const neighborZone = BARRIER_CHECKS[barrierId].between
                        .filter(zoneName => zoneName !== moveRule.from).shift();

                    moveRule.allowed = moveRule.allowed
                        .filter(hexId => hexId !== neighborZone);

                    if (neighborZone)
                        navigatorAccess.push(neighborZone);
                }
            });

            return { ...moveRule, navigatorAccess };
        });
    }

    // MARK: Players
    private draftPlayers(entries: Array<PlayerEntry>): Array<PlayerDraft> {
        const rearranged = lib.randomize(entries);

        const orderTokens = (() => {
            const tokens = Array.from(Array(5).keys());
            tokens.shift();

            while (tokens.length > rearranged.length)
                tokens.pop();

            return tokens;
        })(); // [1,2,...]

        return rearranged.map(e => {
            const token = orderTokens.shift() || 0;

            return {
                socketId: e.socketId,
                color: e.color,
                name: e.name,
                turnOrder: token,
                specialist: null,
                turnToPick: !orderTokens.length,
            };
        });
    }

    private hydratePlayers(
        selections: Array<PlayerSelection>,
        moveRules: Array<DestinationPackage>,
        setupCoordinates: Array<Coordinates>,
        mapPairings: MapPairings,
    ): {
        players: Array<Player>,
        startingPlayerColor: PlayerColor
    } {
        const initialRules = tools.getCopy(moveRules[0]);
        const startingZone = initialRules.from;

        const players: Array<Player> = selections.map(s => {
            const { startingFavor, owner, ...specialist } = s.specialist;

            const playerDto: Player = {
                socketId: s.socketId,
                color: s.color,
                timeStamp: 0,
                isIdle: false,
                name: s.name,
                turnOrder: s.turnOrder,
                specialist,
                isActive: false,
                mayUndo: false,
                bearings: {
                    seaZone: startingZone,
                    position: setupCoordinates.pop() as Coordinates,
                    location: mapPairings.locationByZone[startingZone].name,
                },
                overnightZone: startingZone,
                favor: startingFavor,
                privilegedSailing: false,
                influence: 1,
                moveActions: 0,
                isAnchored: true,
                isHandlingRival: false,
                locationActions: [],
                destinations: [],
                navigatorAccess: [],
                cargo: ['empty', 'empty'],
                feasibleTrades: [],
                feasiblePurchases: [],
                coins: 0,
                turnPurchases: 0,
            };

            if (playerDto.specialist.name === SpecialistName.ambassador)
                playerDto.cargo.push('empty', 'empty');

            return playerDto;
        });

        const startingPlayerColor = players[0].color;

        // debug options
        return {
            players: players.map(player => {
                if (RICH_PLAYERS)
                    player.coins = 99;

                if (FAVORED_PLAYERS)
                    player.favor = 6;

                switch (CARGO_BONUS) {
                    case 1:
                        player.cargo = ['empty', 'empty', 'empty', 'empty'];
                        break;
                    case 2:
                        player.cargo = ['marble', 'gems', 'ebony', 'linen'];
                        break;
                    case 3:
                        player.cargo = ['gold', 'gold_extra', 'silver', 'silver_extra'];
                        break;
                    default:
                        break;
                }

                return player;
            }),
            startingPlayerColor,
        };
    }

    private getRivalShipData(
        isIncluded: boolean,
        hexCoordinates: HexCoordinates[],
        mapPairings: MapPairings,
        activePlayerColor: PlayerColor,
        moveRules: Array<DestinationPackage>,
    ): Rival {

        if (!isIncluded)
            return { isIncluded: false };

        const marketZone = mapPairings.zoneByLocation['market'];

        const hexPosition = hexCoordinates.find(c => c.id === marketZone)!;
        const shipPosition = {
            x: hexPosition.x + 25,
            y: hexPosition.y + 25,
        };

        return {
            isIncluded: true,
            isControllable: false,
            activePlayerColor,
            destinations: moveRules.find(r => r.from === marketZone)!.allowed,
            moves: 2,
            bearings: {
                seaZone: marketZone,
                position: shipPosition,
                location: 'market',
            },
            influence: 1,
        };
    }

    // MARK: Supplies
    private getItemSupplies(players: Array<Player>) {
        const supplyCount = players.length + 1;

        return {
            metals: { gold: supplyCount, silver: supplyCount },
            goods: { gems: supplyCount, linen: supplyCount, ebony: supplyCount, marble: supplyCount },
        };
    }

    // MARK: Market
    private getMarketFluctuations(): MarketFluctuations {
        const pool: Array<Fluctuation> = [-1, 0, 1];

        function selectRandomFluctuation(pool: Array<number>): Fluctuation {
            const pick = Math.floor(Math.random() * pool.length);

            return pool.splice(pick, 1).shift() as Fluctuation;
        }

        return {
            slot_1: selectRandomFluctuation(pool),
            slot_2: selectRandomFluctuation(pool),
            slot_3: selectRandomFluctuation(pool),
        };
    }

    private prepareDeckAndGetOffer(): { tradeDeck: Array<Trade>, marketOffer: MarketOffer } {
        const tradeDeck = lib.randomize(TRADE_DECK_A);

        function drawTrade(): Trade {
            return tradeDeck.shift() as Trade;
        }

        // Remove 5 random cards from the deck
        for (let i = 0; i < 5; i++) {
            drawTrade();
        }

        const marketOffer: MarketOffer = {
            deckId: 'A',
            future: drawTrade(),
            slot_1: drawTrade(),
            slot_2: drawTrade(),
            slot_3: drawTrade(),
            deckSize: tradeDeck.length + TRADE_DECK_B.length, // 35,
        };

        return { tradeDeck, marketOffer };
    }

    // MARK: Temple
    private determineTempleTradeSlot(): MarketSlotKey {

        return (['slot_1', 'slot_2', 'slot_3']
            .splice(Math.floor(Math.random() * 3), 1)
            .shift() as MarketSlotKey
        );
    }

    // MARK: Exchange
    private filterCostTiers(playerCount: number): Array<ExchangeTier> {
        const tiers = tools.getCopy(COST_TIERS);

        return tiers.filter(
            level => !level.skipOnPlayerCounts.includes(playerCount),
        );
    }
}
