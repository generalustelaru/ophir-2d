import { SharedState, BarrierId, HexId, PlayerId, Player, NewState} from '../shared_types';

export type WssMessage = SharedState|NewState|{ error: string};
export type DefaultMoveRule = {
    from: HexId;
    allowed: Array<HexId>;
    blockedBy: Array<BarrierId>;
};
export type ProcessedMoveRule = {
    from: HexId;
    allowed: Array<HexId>;
}

/**
 * @description Not to be shared with clients
*/
export type PrivateState = {
    moveRules: Array<ProcessedMoveRule>,
}

export type StateBundle = {
    sharedState: SharedState,
    privateState: PrivateState,
}

export type BarrierCheck = {
    between: Array<HexId>,
    incompatible: Array<BarrierId>,
};

export type BarrierChecks = Record<BarrierId, BarrierCheck>;

export type ServerConstants = {
    WS_SIGNAL: {
        connection: string,
        message: string,
        close: string,
    },
    DEFAULT_MOVE_RULES: Array<DefaultMoveRule>,
    BARRIER_CHECKS: BarrierChecks,
    PLAYER_IDS: Array<PlayerId>,
    DEFAULT_PLAYER_STATE: Player,
}