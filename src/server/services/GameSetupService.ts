
import {
    SharedState, BarrierId, ZoneName, Coordinates, Player, MarketFluctuations,
    Trade, MarketOffer, MarketSlotKey, LocationData, NewState, Fluctuation,
    PlayerColor, ExchangeTier,
} from '../../shared_types';
import { PrivateState, ProcessedMoveRule, StateBundle } from '../server_types';
import serverConstants from '../server_constants';
import { ToolService } from '../services/ToolService';
import { SharedStateStore } from '../data_classes/SharedStateStore';
import { SERVER_NAME, RICH_PLAYERS, SHORT_GAME, IDLE_CHECKS } from '../configuration';

console.log({ RICH_PLAYERS, SHORT_GAME, IDLE_CHECKS });

const { BARRIER_CHECKS, DEFAULT_MOVE_RULES, TRADE_DECK_A, TRADE_DECK_B, COST_TIERS } = serverConstants;

class GameSetupService {

    private tools: ToolService = new ToolService();

    public produceGameData(newState: NewState, setupCoordinates: Array<Coordinates>): StateBundle {
        const players = this.tools.getCopy(newState.players);

        if (newState.gameId === null) {
            throw new Error('Cannot start game without a game ID');
        }

        if (newState.sessionOwner === null) {
            throw new Error('Cannot start game while the session owner is null');
        }

        if (players.length < 2) {
            throw new Error('Not enough players to start a game');
        }

        const barriers = this.determineBarriers();
        const marketData = this.prepareDeckAndGetOffer();

        const privateState: PrivateState = {
            moveRules: this.produceMoveRules(barriers),
            tradeDeck: marketData.tradeDeck,
            costTiers: this.filterCostTiers(players.length),
            gameStats: players.map(p => ({ id: p.id, vp: 0, gold: 0, silver: 0, favor: 0, coins: 0 })),
        }

        newState.chat.push({ id: null, name: SERVER_NAME, message: 'Game started!' });

        const sharedStateProps: SharedState = {
            isStatusResponse: false,
            gameId: newState.gameId,
            gameStatus: 'started',
            gameResults: null,
            sessionOwner: newState.sessionOwner,
            chat: newState.chat,
            availableSlots: [],
            players: this.assignTurnOneRules(players, privateState.moveRules, setupCoordinates),
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
                barriers: barriers,
                mapPairings: this.determineLocations(),
                marketFluctuations: this.getMarketFluctuations(),
                templeTradeSlot: this.determineTempleTradeSlot(),
            },
        }

        const sharedState = new SharedStateStore(sharedStateProps);

        return { sharedState, privateState };
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
    private assignTurnOneRules(players: Array<Player>, moveRules: Array<ProcessedMoveRule>, setupCoordinates: Array<Coordinates>): Array<Player> {
        const sortedPlayers = ((): Array<Player> => {
            const playerColors = players.map(player => player.id);

            let tokenCount = playerColors.length;
            let error: string = '';

            while (tokenCount > 0 && !error) {
                const pick = Math.floor(Math.random() * playerColors.length);
                const playerColor = playerColors.splice(pick, 1).shift() as PlayerColor;
                const player = players.find(player => player.id === playerColor) as Player;
                player.turnOrder = tokenCount;
                player.isActive = tokenCount === 1;
                player.bearings.position = setupCoordinates.pop() as Coordinates;

                tokenCount -= 1;
            }

            return players.sort((a, b) => a.turnOrder - b.turnOrder);
        })();


        const initialRules = this.tools.getCopy(moveRules[0]);

        return sortedPlayers.map(player => {
            player.bearings.seaZone = initialRules.from;
            player.allowedMoves = initialRules.allowed;

            if (RICH_PLAYERS) {
                player.coins = 99;
                player.cargo = ['gold', 'gold_extra', 'silver', 'silver_extra'];
            }

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
