
import {
    GameState, BarrierId, ZoneName, Coordinates, Player, MarketFluctuations,
    Trade, MarketOffer, MarketSlotKey, LocationData, LobbyState, Fluctuation,
    ExchangeTier, PlayerScaffold,
} from '../../shared_types';
import { PrivateState, ProcessedMoveRule, StateBundle } from '../server_types';
import serverConstants from '../server_constants';
import { ToolService } from '../services/ToolService';
import { GameStateHandler } from '../data_classes/GameState';
import { SERVER_NAME, SINGLE_PLAYER, LOADED_PLAYERS, RICH_PLAYERS, SHORT_GAME, IDLE_CHECKS } from '../configuration';
import { PlayerHandler } from '../data_classes/Player';

console.log({ SINGLE_PLAYER, LOADED_PLAYERS, RICH_PLAYERS, SHORT_GAME, IDLE_CHECKS });
const { BARRIER_CHECKS, DEFAULT_MOVE_RULES, TRADE_DECK_A, TRADE_DECK_B, COST_TIERS } = serverConstants;

class GameSetupService {

    private tools: ToolService = new ToolService();

    /**
     * @param setupCoordinates Coordinates are required for client distribution via the gameState
     * @returns `{gameState, privateState}`  Used expressily for a game session instance.
     */
    public produceGameData(lobbyState: LobbyState, setupCoordinates: Array<Coordinates>): StateBundle {

        if (lobbyState.gameId === null)
            throw new Error('Cannot start game without a game ID');

        if (lobbyState.sessionOwner === null)
            throw new Error('Cannot start game while the session owner is null');

        const players = this.tools.getCopy(lobbyState.players);

        if (!players.every(p => Boolean(p.id)))
            throw new Error('Found unidentifiable players.');

        if (players.length < 2 && !SINGLE_PLAYER)
            throw new Error('Not enough players to start a game.');

        const barriers = this.determineBarriers();
        const mapPairings = this.determineLocations();
        const marketData = this.prepareDeckAndGetOffer();

        const privateState: PrivateState = {
            moveRules: this.produceMoveRules(barriers),
            tradeDeck: marketData.tradeDeck,
            costTiers: this.filterCostTiers(players.length),
            gameStats: players.map(p => ({ id: p.id!, vp: 0, gold: 0, silver: 0, favor: 0, coins: 0 })),
        }

        lobbyState.chat.push({ id: null, name: SERVER_NAME, message: 'Game started!' });

        const stateDto: GameState = {
            isStatusResponse: false,
            gameId: lobbyState.gameId,
            gameStatus: 'started',
            gameResults: [],
            sessionOwner: lobbyState.sessionOwner,
            chat: lobbyState.chat,
            availableSlots: [],
            players: this.hydratePlayers(players, privateState.moveRules, setupCoordinates, mapPairings),
            market: marketData.marketOffer,
            itemSupplies: { metals: { gold: 5, silver: 5 }, goods: { gems: 5, cloth: 5, wood: 5, stone: 5 } },
            temple: {
                maxLevel: privateState.costTiers.length,
                treasury: privateState.costTiers.shift()?.costs!,
                levelCompletion: 0,
                currentLevel: 0,
                donations: [],
            },
            setup: {
                barriers,
                mapPairings,
                marketFluctuations: this.getMarketFluctuations(),
                templeTradeSlot: this.determineTempleTradeSlot(),
            },
        }

        const gameState = new GameStateHandler(stateDto);

        return { gameState, privateState };
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

    private determineLocations(): Record<ZoneName, LocationData> {
        const locations = this.tools.getCopy(serverConstants.LOCATION_ACTIONS);

        if (locations.length !== 7) {
            throw new Error(`Invalid number of locations! Expected 7, got {${locations.length}}`);
        }

        function locationData(): LocationData {
            const pick = Math.floor(Math.random() * locations.length);

            return locations.splice(pick, 1).shift() as LocationData;
        }

        return {
            center: locationData(),
            topRight: locationData(),
            right: locationData(),
            bottomRight: locationData(),
            bottomLeft: locationData(),
            left: locationData(),
            topLeft: locationData(),
        }
    }

    private produceMoveRules(barrierIds: Array<BarrierId>): Array<ProcessedMoveRule> {

        return this.tools.getCopy(DEFAULT_MOVE_RULES).map(moveRule => {

            barrierIds.forEach(barrierId => {

                if (moveRule.blockedBy.find(id => id === barrierId)) {
                    const neighborHex = BARRIER_CHECKS[barrierId].between
                        .filter(hexId => hexId !== moveRule.from).shift();

                    moveRule.allowed = moveRule.allowed
                        .filter(hexId => hexId !== neighborHex);
                }
            });

            return moveRule;
        });
    }

    // MARK: Players

    private hydratePlayers(
        scaffolds: Array<PlayerScaffold>,
        moveRules: Array<ProcessedMoveRule>,
        setupCoordinates: Array<Coordinates>,
        mapPairings: Record<ZoneName, LocationData>,
    ): Array<Player> {
        const initialRules = this.tools.getCopy(moveRules[0]);
        const startingZone = initialRules.from;
        const randomScaffolds = scaffolds
            .map(p => {
                return { player: p, order: Math.random() }
            })
            .sort((a, b) => a.order - b.order)
            .map(o => o.player);

        const orderTokens = (() => {
            const t = Array.from(Array(5).keys());
            t.shift();
            return t;
        })(); // [1,2,3,4]

        const players: Array<Player> = randomScaffolds.map(p => {
            const order = orderTokens.shift()!;
            const playerDto: Player = {
                id: p.id,
                timeStamp: 0,
                isIdle: false,
                name: p.name,
                turnOrder: order,
                isActive: order == 1,
                bearings: {
                    seaZone: startingZone,
                    position: setupCoordinates.pop() as Coordinates,
                    location: mapPairings[startingZone].name
                },
                favor: 2,
                privilegedSailing: false,
                influence: 1,
                moveActions: 0,
                isAnchored: true,
                locationActions: null,
                allowedMoves: initialRules.allowed,
                hasCargo: false,
                cargo: ['empty', 'empty'],
                feasibleTrades: [],
                coins: 0,
            }

            if (playerDto.isActive) {
                const player = new PlayerHandler(playerDto);
                player.activate(mapPairings[startingZone].actions);

                return player.toDto();
            }

            return playerDto;
        });

        // debug options
        return players.map(player => {
            if (RICH_PLAYERS)
                player.coins = 99;
            if (LOADED_PLAYERS)
                player.cargo = ['gold', 'gold_extra', 'silver', 'silver_extra'];

            return player;
        });
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
        const tradeDeck = this.tools.getCopy(TRADE_DECK_A);

        function drawRandomCard(): Trade {
            const pick = Math.floor(Math.random() * tradeDeck.length);

            return tradeDeck.splice(pick, 1).shift() as Trade;
        }

        // Remove 5 random cards from the deck
        for (let i = 0; i < 5; i++) {
            drawRandomCard();
        }

        const marketOffer: MarketOffer = {
            deckId: 'A',
            future: drawRandomCard(),
            slot_1: drawRandomCard(),
            slot_2: drawRandomCard(),
            slot_3: drawRandomCard(),
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
        const tiers = this.tools.getCopy(COST_TIERS);

        if (SHORT_GAME) {
            return [tiers[0]];
        }

        return tiers.filter(
            level => !level.skipOnPlayerCounts.includes(playerCount)
        );
    }
}

export const gameSetupService = new GameSetupService();
