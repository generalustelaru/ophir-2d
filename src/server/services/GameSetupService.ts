
import { SharedState, BarrierId, HexId, Coordinates, Player, MarketFluctuations, Trade, MarketOffer, MarketKey, Location, TempleLevel, TempleStatus, NewState } from '../../shared_types';
import { PrivateState, ProcessedMoveRule, StateBundle } from '../server_types';
import serverConstants from '../server_constants';
import { Service } from './Service';
import { ToolService } from '../services/ToolService';

const { BARRIER_CHECKS, DEFAULT_MOVE_RULES, TRADE_DECK_A, TEMPLE_LEVELS } = serverConstants;

export class GameSetupService extends Service {

    private tools: ToolService = ToolService.getInstance();

    public produceGameData(newState: NewState, setupCoordinates: Array<Coordinates>): StateBundle {
        const players = this.tools.getCopy(newState.players);

        if (newState.sessionOwner === null) {
            throw new Error('Cannot start game while the session owner is null');
        }
        // TODO: Re-enable this check when the game is ready to be played
        // if (players.length < 2) {
        //     throw new Error('Not enough players to start a game');
        // }

        const barriers = this.determineBarriers();
        const marketData = this.prepareDeckAndGetOffer((TRADE_DECK_A));

        const privateState: PrivateState = {
            moveRules: this.produceMoveRules(barriers),
            tradeDeck: marketData.tradeDeck,
            playerVPs: players.map(p => ({id: p.id, vp: 0})),
        }

        const sharedState: SharedState = {
            gameStatus: 'started',
            gameResults: null,
            sessionOwner: newState.sessionOwner,
            availableSlots: [],
            players: this.assignTurnOneRules(
                this.assignTurnOrderAndPosition(players, setupCoordinates),
                privateState.moveRules
            ),
            marketOffer: marketData.marketOffer,
            templeStatus: this.createTempleStatus(players.length),
            setup: {
                barriers: barriers,
                mapPairings: this.determineLocations(),
                marketFluctuations: this.determineFluctuations(),
                templeTradeSlot: this.determineTempleTradeSlot(),
            },
        }

        return { sharedState, privateState };
    };
    // MARK: Player Setup
    private assignTurnOrderAndPosition(players: Array<Player>, setupCoordinates: Array<Coordinates>): Array<Player> {
        const playerIds = players.map(player => player.id);

        let tokenCount = playerIds.length;

        while (tokenCount > 0) {
            const pick = Math.floor(Math.random() * playerIds.length);
            const playerId = playerIds.splice(pick, 1).shift();
            const player = players.find(player => player.id === playerId) as Player;
            player.turnOrder = tokenCount;
            player.isActive = tokenCount === 1;
            player.hexagon.position = setupCoordinates.pop() as Coordinates;
            tokenCount -= 1;
        }

        return players.sort((a, b) => a.turnOrder - b.turnOrder);
    }

    private determineBarriers(): Array<BarrierId> {

        const b1 = Math.ceil(Math.random() * 12) as BarrierId;
        let b2 = b1;

        while (BARRIER_CHECKS[b1].incompatible.find(id => id === b2)) {
            b2 = Math.ceil(Math.random() * 12) as BarrierId;
        }

        return [b1, b2];
    }
    // MARK: Map Locations
    private determineLocations(): Record<HexId, Location> {
        const locations = this.tools.getCopy(serverConstants.LOCATION_ACTIONS);
        const locationPairing: Record<HexId, null | Location> = {
            center: null,
            topRight: null,
            right: null,
            bottomRight: null,
            bottomLeft: null,
            left: null,
            topLeft: null,
        }

        for (const key in locationPairing) {
            const hexId = key as HexId;
            const pick = Math.floor(Math.random() * locations.length);

            locationPairing[hexId] = locations.splice(pick, 1)[0];
        }

        return locationPairing as Record<HexId, Location>;
    }

    private assignTurnOneRules(players: Array<Player>, moveRules: Array<ProcessedMoveRule>): Array<Player> {
        const initialPlacement = moveRules[0];

        players.forEach(player => {
            player.hexagon.hexId = initialPlacement.from;
            player.allowedMoves = initialPlacement.allowed;
        });

        return players;
    }
    // MARK: Move Rules
    private produceMoveRules(barrierIds: Array<BarrierId>): Array<ProcessedMoveRule> {
        const rules: Array<ProcessedMoveRule> = [];
        const defaultMoveRules = this.tools.getCopy(DEFAULT_MOVE_RULES);

        defaultMoveRules.forEach(moveRule => {

            barrierIds.forEach(barrierId => {

                if (moveRule.blockedBy.find(id => id === barrierId)) {
                    const neighborHex = BARRIER_CHECKS[barrierId].between
                        .filter(hexId => hexId !== moveRule.from).shift();

                    moveRule.allowed = moveRule.allowed
                        .filter(hexId => hexId !== neighborHex);
                }
            });

            rules.push({
                from: moveRule.from,
                allowed: moveRule.allowed,
            });
        });

        return rules;
    }

    private determineFluctuations(): MarketFluctuations {
        const pool = [-1, 0, 1];
        const keys = ['slot_1', 'slot_2', 'slot_3'];
        const result: any = {};

        for (const key of keys) {
            const pick = Math.floor(Math.random() * pool.length);
            result[key] = pool.splice(pick, 1).shift();
        }

        return result as MarketFluctuations;
    }

    private determineTempleTradeSlot(): MarketKey {
        const pool = ['slot_1', 'slot_2', 'slot_3'];
        const pick = Math.floor(Math.random() * pool.length);

        return pool.splice(pick, 1).shift() as MarketKey;
    }
    // MARK: Market Offer
    private prepareDeckAndGetOffer(trades: Array<Trade>): { tradeDeck: Array<Trade>, marketOffer: MarketOffer } {
        let tradeDeck = this.tools.getCopy(trades);

        const drawRandomCard = (deck: Array<Trade>) => {
            const pick = Math.floor(Math.random() * deck.length);

            return deck.splice(pick, 1).shift();
        }

        // Remove 5 random cards from the deck
        for (let i = 0; i < 5; i++) {
            drawRandomCard(tradeDeck);
        }

        const marketOffer = {
            deckSize: 35,
            deckId: 'A',
            future: drawRandomCard(tradeDeck),
            slot_1: drawRandomCard(tradeDeck),
            slot_2: drawRandomCard(tradeDeck),
            slot_3: drawRandomCard(tradeDeck),
        } as MarketOffer;

        return { tradeDeck, marketOffer };
    }
    // MARK: Temple Status
    private createTempleStatus(playerCount: number): TempleStatus {
        const levels = this.tools.getCopy(TEMPLE_LEVELS);

        return {
            level: ((): TempleLevel => {
                for (const level of levels) {
                    if (level.skipOnPlayerCount !== playerCount)
                        return level;
                }
                return levels[0];
            })(),
            levelCompletion: 0,
            donations: [],
        }
    }
}
