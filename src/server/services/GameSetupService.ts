
import {
    BarrierId, ZoneName, Coordinates, Player, PlayerColor, MarketFluctuations,
    Trade, MarketOffer, MarketSlotKey, LocationData, LobbyState, Fluctuation,
    ExchangeTier, PlayerScaffold, RivalData,
    GameSetupPayload,
} from '../../shared_types';
import { DestinationPackage, StateBundle } from '../server_types';
import serverConstants from '../server_constants';
import { ToolService } from '../services/ToolService';
import { GameStateHandler } from '../data_classes/GameState';
import { SERVER_NAME, SINGLE_PLAYER, LOADED_PLAYERS, RICH_PLAYERS, SHORT_GAME, IDLE_CHECKS } from '../configuration';
import { PlayerHandler } from '../data_classes/Player';
import { PrivateStateHandler } from '../data_classes/PrivateState';
import { HexCoordinates } from '../../client/client_types';

console.log({ SINGLE_PLAYER, LOADED_PLAYERS, RICH_PLAYERS, SHORT_GAME, IDLE_CHECKS });
const { BARRIER_CHECKS, DEFAULT_MOVE_RULES, TRADE_DECK_A, TRADE_DECK_B, COST_TIERS, LOCATION_ACTIONS } = serverConstants;

class GameSetupService {

    private tools: ToolService = new ToolService();

    /**
     * @param clientSetupPayload Coordinates are required for client distribution via the gameState
     * @returns `{gameState, privateState}`  Used expressily for a game session instance.
     */
    public produceGameData(
        lobbyState: LobbyState,
        clientSetupPayload: GameSetupPayload,
    ): StateBundle {

        if (lobbyState.gameId === null)
            throw new Error('Cannot start game without a game ID');

        if (lobbyState.sessionOwner === null)
            throw new Error('Cannot start game while the session owner is null');

        const playerScaffolds = this.tools.getCopy(lobbyState.players);

        if (!playerScaffolds.every(p => Boolean(p.id)))
            throw new Error('Found unidentifiable players.');

        if (playerScaffolds.length < 2 && !SINGLE_PLAYER)
            throw new Error('Not enough players to start a game.');

        const barriers = this.determineBarriers();
        const mapPairings = this.determineLocations();
        const marketData = this.prepareDeckAndGetOffer();

        const privateState = new PrivateStateHandler({
            destinationPackages: this.produceMoveRules(barriers),
            tradeDeck: marketData.tradeDeck,
            costTiers: this.filterCostTiers(playerScaffolds.length),
            gameStats: playerScaffolds.map(p => ({ id: p.id!, vp: 0, gold: 0, silver: 0, favor: 0, coins: 0 })),
        });

        const { players, startingPlayerColor } = this.hydratePlayers(
            playerScaffolds,
            privateState.getDestinationPackages(),
            clientSetupPayload.startingPositions,
            mapPairings
        );

        const gameState = new GameStateHandler({
            isStatusResponse: false,
            gameId: lobbyState.gameId,
            gameStatus: 'started',
            gameResults: [],
            sessionOwner: lobbyState.sessionOwner,
            chat: lobbyState.chat,
            availableSlots: [],
            players,
            market: marketData.marketOffer,
            itemSupplies: { metals: { gold: 5, silver: 5 }, goods: { gems: 5, cloth: 5, wood: 5, stone: 5 } },
            temple: {
                maxLevel: privateState.getTempleLevelCount(),
                treasury: privateState.drawMetalPrices()!,
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
            rival: this.getRivalShipData(
                Boolean(playerScaffolds.length < 3),
                clientSetupPayload.hexPositions,
                mapPairings,
                startingPlayerColor,
                privateState.getDestinationPackages(),
            ),
        });
        gameState.addChatEntry({ id: null, name: SERVER_NAME, message: 'Game started!' });

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
        const locations = LOCATION_ACTIONS
            .map(location => { return {key: Math.random(), location} })
            .sort((a,b) => a.key - b.key)
            .map(item => item.location);

        if (locations.length !== 7) {
            throw new Error(`Invalid number of locations! Expected 7, got {${locations.length}}`);
        }

        function drawLocation(): LocationData {
            return locations.shift() as LocationData;
        }

        return {
            center: drawLocation(),
            topRight: drawLocation(),
            right: drawLocation(),
            bottomRight: drawLocation(),
            bottomLeft: drawLocation(),
            left: drawLocation(),
            topLeft: drawLocation(),
        }
    }

    private produceMoveRules(barrierIds: Array<BarrierId>): Array<DestinationPackage> {

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
        moveRules: Array<DestinationPackage>,
        setupCoordinates: Array<Coordinates>,
        mapPairings: Record<ZoneName, LocationData>,
    ): {
        players: Array<Player>,
        startingPlayerColor: PlayerColor
    } {
        const initialRules = this.tools.getCopy(moveRules[0]);
        const startingZone = initialRules.from;
        const randomScaffolds = scaffolds
            .map(p => {return { player: p, order: Math.random() }})
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
                isActive: false,
                bearings: {
                    seaZone: startingZone,
                    position: setupCoordinates.pop() as Coordinates,
                    location: mapPairings[startingZone].name
                },
                overnightZone: startingZone,
                favor: 2,
                privilegedSailing: false,
                influence: 1,
                moveActions: 0,
                isAnchored: true,
                isHandlingRival: false,
                locationActions: [],
                destinations: [],
                hasCargo: false,
                cargo: ['empty', 'empty'],
                feasibleTrades: [],
                coins: 0,
            }

            if (playerDto.turnOrder == 1) {
                const player = new PlayerHandler(playerDto);
                player.activate(mapPairings[startingZone].actions, initialRules.allowed);

                return player.toDto();
            }

            return playerDto;
        });

        const startingPlayerColor = players[0].id;

        // debug options
        return {
            players: players.map(player => {
                if (RICH_PLAYERS)
                    player.coins = 99;
                if (LOADED_PLAYERS)
                    player.cargo = ['gold', 'gold_extra', 'silver', 'silver_extra'];

                return player;
            }),
            startingPlayerColor,
        };
    }

    private getRivalShipData(
        isIncluded: boolean,
        hexCoordinates: HexCoordinates[],
        mapPairings: Record<ZoneName, LocationData>,
        activePlayerColor: PlayerColor,
        moveRules: Array<DestinationPackage>,
    ): RivalData {

        if (!isIncluded)
            return { isIncluded: false }

        const marketZone = Object.keys(mapPairings).find(key => {
            const zoneName = key as keyof Record<ZoneName, LocationData>;
            return mapPairings[zoneName].name === 'market';
        }) as ZoneName;

        const hexPosition = hexCoordinates.find(c => c.id === marketZone)!;
        const shipPosition = {
            x: hexPosition.x + 25,
            y: hexPosition.y + 25,
        }

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
        }
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
        const tradeDeck = TRADE_DECK_A
            .map(t => { return { key: Math.random(), trade: t } })
            .sort((a,b) => a.key - b.key)
            .map(s => s.trade);

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
