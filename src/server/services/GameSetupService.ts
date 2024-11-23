
import { SharedState, GameSetup, BarrierId, HexId, Coordinates, Player, MarketFluctuations, Trade, MarketOffer, MarketKey, Location } from '../../shared_types';
import { PlayerVP, PrivateState, ProcessedMoveRule, StateBundle } from '../server_types';
import serverConstants from '../server_constants';
import { Service } from './Service';
import { ToolService } from '../services/ToolService';

const { BARRIER_CHECKS, DEFAULT_MOVE_RULES, TRADE_DECK_A } = serverConstants;

export class GameSetupService extends Service {

    private tools: ToolService = ToolService.getInstance();
    public produceGameData(sharedState: SharedState, setupCoordinates: Array<Coordinates>): StateBundle {
        sharedState.players = this.assignTurnOrderAndPosition(sharedState.players, setupCoordinates);
        sharedState.setup = this.determineBoardPieces();

        const privateState: PrivateState = {
            moveRules: this.produceMoveRules(sharedState.setup.barriers),
            tradeDeck: this.tools.getCopy(TRADE_DECK_A),
            playerVPs: sharedState.players.map(p => ({id: p.id, vp: 0})) as Array<PlayerVP>,
        }

        sharedState.players = this.assignTurnOneRules(sharedState.players, privateState.moveRules);

        const { tradeDeck, marketOffer } = this.prepareDeckAndGetOffer(this.tools.getCopy(privateState.tradeDeck));
        privateState.tradeDeck = tradeDeck;
        sharedState.marketOffer = marketOffer;

        const bundle: StateBundle = {
            sharedState: sharedState,
            privateState: privateState,
        }

        return bundle;
    };

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

    private determineBoardPieces(): GameSetup {
        const setup = {
            barriers: this.determineBarriers(),
            mapPairings: this.determineLocations(),
            marketFluctuations: this.determineFluctuations(),
            templeTradeSlot: this.determineTempleTradeSlot(),
        }

        return setup;
    }

    private determineBarriers(): Array<BarrierId> {

        const b1 = Math.ceil(Math.random() * 12) as BarrierId;
        let b2 = b1;

        while (!this.isArrangementLegal(b1, b2)) {
            b2 = Math.ceil(Math.random() * 12) as BarrierId;
        }

        return [b1, b2];
    }

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

    private isArrangementLegal(b1: BarrierId, b2: BarrierId): boolean {

        if (b1 === b2) {
            return false;
        }

        const check = BARRIER_CHECKS[b1];

        if (check.incompatible.find(id => id === b2)) {
            return false;
        }

        return true;
    }

    private assignTurnOneRules(players: Array<Player>, moveRules: Array<ProcessedMoveRule>): Array<Player> {
        const initialPlacement = moveRules[0];

        players.forEach(player => {
            player.hexagon.hexId = initialPlacement.from;
            player.allowedMoves = initialPlacement.allowed;
        });

        return players;
    }

    private produceMoveRules(barrierIds: Array<BarrierId>): Array<ProcessedMoveRule> {
        const rules: Array<ProcessedMoveRule> = [];

        DEFAULT_MOVE_RULES.forEach(moveRule => {

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
            deckId: 'A',
            future: drawRandomCard(tradeDeck),
            slot_1: drawRandomCard(tradeDeck),
            slot_2: drawRandomCard(tradeDeck),
            slot_3: drawRandomCard(tradeDeck),
        } as MarketOffer;

        return { tradeDeck, marketOffer };
    }
}
