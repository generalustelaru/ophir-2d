
import { PlayerId, SharedState, GameSetup, BarrierId, HexId, SettlementId, Coordinates, Player, MarketFluctuations } from '../../shared_types';
import { PrivateState, ProcessedMoveRule, StateBundle } from '../server_types';
import serverConstants from '../server_constants';
import { Service } from './Service';
import { ToolService } from '../services/ToolService';

const { BARRIER_CHECKS, DEFAULT_MOVE_RULES } = serverConstants;

export class GameSetupService extends Service {

    public produceGameData(state: SharedState, setupCoordinates: Array<Coordinates>): StateBundle {
        state.players = this.assignTurnOrderAndPosition(state.players, setupCoordinates);
        state.setup = this.determineBoardPieces();

        const tools: ToolService = ToolService.getInstance();

        const privateState: PrivateState = {
            moveRules: this.produceMoveRules(state.setup.barriers),
            marketContracts: tools.getCopy(serverConstants.MARKET_CONTRACTS),
        }

        state.players = this.assignTurnOneRules(
            state.players,
            privateState.moveRules
        );

        const bundle: StateBundle = {
            sharedState: state,
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
            player.location.position = setupCoordinates.pop() as Coordinates;
            tokenCount -= 1;
        }

        return players.sort((a, b) => a.turnOrder - b.turnOrder);
    }

    private determineBoardPieces(): GameSetup {
        const setup = {
            barriers: this.determineBarriers(),
            settlements: this.determineSettlements(),
            marketFluctuations: this.determineFluctuations(),
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

    private determineSettlements(): Record<HexId, SettlementId> {
        const settlementIds: Array<SettlementId> = [
            "temple", "market", "exchange",
            "quary", "forest", "mines", "farms",
        ];
        const pairing: Record<HexId, null|SettlementId> = {
            center: null,
            topRight: null,
            right: null,
            bottomRight: null,
            bottomLeft: null,
            left: null,
            topLeft: null,
        }

        for (const id in pairing) {
            const hexId = id as HexId;
            const pick = Math.floor(Math.random() * settlementIds.length);
            pairing[hexId] = settlementIds.splice(pick, 1)[0];
        }

        return pairing as Record<HexId, SettlementId>;
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

    private assignTurnOneRules(players: Array<Player>, rules: Array<ProcessedMoveRule>): Array<Player> {
        const initialPlacement = rules[0];

        players.forEach(player => {
            player.location.hexId = initialPlacement.from;
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
}