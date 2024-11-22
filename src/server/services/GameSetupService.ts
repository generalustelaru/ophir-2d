
import { PlayerId, SharedState, GameSetup, BarrierId, HexId, Coordinates, Player, MarketFluctuations, TradeRequest, MarketOffer, MarketKey, Location } from '../../shared_types';
import { PrivateState, ProcessedMoveRule, StateBundle } from '../server_types';
import serverConstants from '../server_constants';
import { Service } from './Service';
import { ToolService } from '../services/ToolService';

const { BARRIER_CHECKS, DEFAULT_MOVE_RULES } = serverConstants;

export class GameSetupService extends Service {

    private tools: ToolService = ToolService.getInstance();
    public produceGameData(sharedState: SharedState, setupCoordinates: Array<Coordinates>): StateBundle {
        sharedState.players = this.assignTurnOrderAndPosition(sharedState.players, setupCoordinates);
        sharedState.setup = this.determineBoardPieces();

        const privateState: PrivateState = {
            moveRules: this.produceMoveRules(sharedState.setup.barriers),
            marketDeck: this.tools.getCopy(serverConstants.MARKET_CONTRACTS_A),
        }

        sharedState.players = this.assignTurnOneRules(sharedState.players, privateState.moveRules);

        const { contractDeck, marketOffer } = this.extractInitialContracts(this.tools.getCopy(privateState.marketDeck));
        privateState.marketDeck = contractDeck;
        sharedState.market = marketOffer;

        const bundle: StateBundle = {
            sharedState: sharedState,
            privateState: privateState,
        }

        return bundle;
    };

    private assignTurnOrderAndPosition(players: Array<Player>, setupCoordinates: Array<Coordinates>): Array<Player> {
        const playerIds = players.reduce((acc: Array<PlayerId>, player: Player) => {
            acc.push(player.id);
            return acc;
        }, []);

        let tokenCount = playerIds.length;

        while (tokenCount > 0) {
            const pick = Math.floor(Math.random() * playerIds.length);
            const playerId = playerIds.splice(pick, 1)[0];
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
        const locationPairing: Record<HexId, null|Location> = {
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
                        .filter(hexId => hexId !== moveRule.from)[0];

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
            result[key] = pool.splice(pick, 1)[0];
        }

        return result as MarketFluctuations;
    }

    private determineTempleTradeSlot(): MarketKey {
        const pool = ['slot_1', 'slot_2', 'slot_3'];
        const pick = Math.floor(Math.random() * pool.length);
        return pool.splice(pick, 1)[0] as MarketKey;
    }

    private extractInitialContracts(contracts: Array<TradeRequest>): {contractDeck: Array<TradeRequest>, marketOffer: MarketOffer} {
        const keys = ['future', 'slot_1', 'slot_2', 'slot_3'];
        const marketOffer = {deck: 'A'} as any;

        keys.forEach(key => {
            const pick = Math.floor(Math.random() * contracts.length);
            marketOffer[key] = contracts.splice(pick, 1).shift();
        });

        return { contractDeck: contracts, marketOffer: marketOffer as MarketOffer };
    }
}
