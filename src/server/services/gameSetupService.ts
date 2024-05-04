
import { PlayerId, PlayerStates, ServerState, GameSetup, BarrierId } from '../../shared_types';
import { BarrierChecks, DefaultMoveRule, ProcessedMoveRule  } from '../server_types';
import constants from '../../constants';
import serverConstants from '../server_constants';

const { STATUS } = constants;
const { PLAYER_IDS, PLAYER_STATE, BARRIER_CHECKS } = serverConstants;
export class GameSetupService { // TODO: Create a singleton parent class like on the client for this.

    session: ServerState;
    constructor(
        session: ServerState
    ) {
        this.session = session;
    }

    public processPlayer(playerId: PlayerId): boolean {

        if (this.session.status === STATUS.started || this.session.status === STATUS.full) {
            console.log(`${playerId} cannot enroll`);

            return false;
        }

        if (false == PLAYER_IDS.includes(playerId)) {
            console.log(`${playerId} is not a valid player`);

            return false;
        }

        this.session.availableSlots = this.session.availableSlots.filter(slot => slot != playerId);

        if (this.session.players === null) {
            this.session.players = { [playerId]: { ...PLAYER_STATE } } as PlayerStates;
        } else {
            this.session.players[playerId] = { ...PLAYER_STATE };
        }

        console.log(`${playerId} enrolled`);

        if (this.session.sessionOwner === null) {
            this.session.status = STATUS.created;
            this.session.sessionOwner = playerId;
            console.log(`${playerId} is the session owner`);
        }

        if (this.session.availableSlots.length === 0) {
            this.session.status = STATUS.full;
            console.log(`Session is full`);
        }

        return true;
    }

    public assignTurnOrder (states: PlayerStates): PlayerStates {
        const playerIds = Object.keys(states) as PlayerId[];
        let tokenCount = playerIds.length;

        while (tokenCount > 0) {
            const randomPick = Math.floor(Math.random() * playerIds.length);
            const playerId = playerIds.splice(randomPick, 1)[0];
            states[playerId].turnOrder = tokenCount;
            tokenCount -= 1;
        }

        return states;
    }

    public determineBoardPieces(): GameSetup {
        const setup = {
            barriers: this.determineBarriers(BARRIER_CHECKS),
            //TODO: settlements: determineSettlements(), // Collection<hexId, settlementId> // Settlements should be implemented after the influence and favor mechanics are in place
        }

        return setup;
    }

    private determineBarriers (barrierChecks: BarrierChecks): BarrierId[] {

        const b1 = Math.ceil(Math.random() * 12) as BarrierId;
        let b2: BarrierId = null;

        while (false === this.isArrangementLegal(barrierChecks, b1, b2)) {
            b2 = Math.ceil(Math.random() * 12) as BarrierId;
        }

        return [b1, b2];
    }

    private isArrangementLegal (
        barrierChecks: BarrierChecks, b1: BarrierId, b2: BarrierId
    ): boolean {

        if (!b2 || b1 === b2) {
            return false;
        }

        const check = barrierChecks[b1];

        if (check.incompatible.find(id => id === b2)) {
            return false;
        }

        return true;
    }

    // TODO:switch to calling filterAllowedMoves() here when the setup is delivered from this class
    public hydrateMoveRules (
        states: PlayerStates, moveRules: ProcessedMoveRule[]
    ): PlayerStates {
        const initialPlacement = moveRules[0];

        for (const id in states) {
            const playerId = id as PlayerId;
            const player = states[playerId];

            player.location = {
                hexId: initialPlacement.from,
                position: null};
            player.allowedMoves = initialPlacement.allowed;
        }

        return states;
    }

    public filterAllowedMoves ( // TODO: make this a private method
        defaultMoves: DefaultMoveRule[],
        barrierChecks: BarrierChecks,
        barrierIds: BarrierId[]
    ): ProcessedMoveRule[] {
        const filteredMoves: ProcessedMoveRule[] = [];

        defaultMoves.forEach(moveRule => {

            barrierIds.forEach(barrierId => {

                if (moveRule.blockedBy.find(id => id === barrierId)) {
                    const neighborHex = barrierChecks[barrierId].between
                        .filter(hexId => hexId != moveRule.from)[0];

                    moveRule.allowed = moveRule.allowed
                        .filter(hexId => hexId != neighborHex);
                }
            });

            filteredMoves.push({
                from: moveRule.from,
                allowed: moveRule.allowed,
            });
        });

        return filteredMoves;
    }
}