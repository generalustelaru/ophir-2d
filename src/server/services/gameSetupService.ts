
import { PlayerId, PlayerStates, SharedState, GameSetup, BarrierId, HexId, SettlementId } from '../../shared_types';
import { ProcessedMoveRule, StateBundle } from '../server_types';
import serverConstants from '../server_constants';
import { Service, ServiceInterface } from './service';

const { BARRIER_CHECKS, DEFAULT_MOVE_RULES } = serverConstants;

export interface GameSetupInterface extends ServiceInterface {
    produceGameData: (state: SharedState) => StateBundle,
}

export class GameSetupService extends Service implements GameSetupInterface {

    constructor() {
        super();
    }

    public produceGameData(state: SharedState): StateBundle {
        // state.status = STATUS.setup; TODO: for when players will need to draft their characters
        state.players = this.assignTurnOrder(state.players);
        state.setup = this.determineBoardPieces();

        const privateState = {
            moveRules: this.produceMoveRules(state.setup.barriers),
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

    private assignTurnOrder(states: PlayerStates): PlayerStates {
        const playerIds = Object.keys(states) as PlayerId[];
        let tokenCount = playerIds.length;

        while (tokenCount > 0) {
            const pick = Math.floor(Math.random() * playerIds.length);
            const playerId = playerIds.splice(pick, 1)[0];
            states[playerId].turnOrder = tokenCount;
            states[playerId].isActive = tokenCount === 1;
            tokenCount -= 1;
        }

        return states;
    }

    private determineBoardPieces(): GameSetup {
        const setup = {
            barriers: this.determineBarriers(),
            settlements: this.determineSettlements(),
        }

        return setup;
    }

    private determineBarriers(): BarrierId[] {

        const b1 = Math.ceil(Math.random() * 12) as BarrierId;
        let b2: BarrierId = null;

        while (!this.isArrangementLegal(b1, b2)) {
            b2 = Math.ceil(Math.random() * 12) as BarrierId;
        }

        return [b1, b2];
    }

    private determineSettlements(): Record<HexId, SettlementId> {
        const settlementIds: SettlementId[] = ["temple", "market", "exchange", "quary", "forest", "mines", "farms"];
        const pairing: Record<HexId, SettlementId> = {
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

        return pairing;
    }

    private isArrangementLegal(b1: BarrierId, b2: BarrierId): boolean {

        if (!b2 || b1 === b2) {
            return false;
        }

        const check = BARRIER_CHECKS[b1];

        if (check.incompatible.find(id => id === b2)) {
            return false;
        }

        return true;
    }

    private assignTurnOneRules(
        states: PlayerStates, rules: ProcessedMoveRule[]
    ): PlayerStates {
        const initialPlacement = rules[0];

        for (const id in states) {
            const playerId = id as PlayerId;
            const player = states[playerId];

            player.location = {
                hexId: initialPlacement.from,
                position: null
            };
            player.allowedMoves = initialPlacement.allowed;
        }

        return states;
    }

    private produceMoveRules(barrierIds: BarrierId[]): ProcessedMoveRule[] {
        const rules: ProcessedMoveRule[] = [];

        DEFAULT_MOVE_RULES.forEach(moveRule => {

            barrierIds.forEach(barrierId => {

                if (moveRule.blockedBy.find(id => id === barrierId)) {
                    const neighborHex = BARRIER_CHECKS[barrierId].between
                        .filter(hexId => hexId != moveRule.from)[0];

                    moveRule.allowed = moveRule.allowed
                        .filter(hexId => hexId != neighborHex);
                }
            });

            rules.push({
                from: moveRule.from,
                allowed: moveRule.allowed,
            });
        });

        return rules;
    }
}