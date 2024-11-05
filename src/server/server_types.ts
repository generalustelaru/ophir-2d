import { SharedState, BarrierId, HexId, PlayerId, PlayerState, PreSessionSharedState} from '../shared_types';

export type WssMessage = SharedState | PreSessionSharedState | { error: string};
export type DefaultMoveRule = {
    from: HexId;
    allowed: HexId[];
    blockedBy: BarrierId[];
};
export type ProcessedMoveRule = {
    from: HexId;
    allowed: HexId[];
}

/**
 * @description Not to be shared with clients
*/
export type PrivateState = {
    moveRules: ProcessedMoveRule[],
}

export type StateBundle = {
    sharedState: SharedState,
    privateState: PrivateState,
}

export type BarrierCheck = {
    between: HexId[],
    incompatible: BarrierId[],
};

export type BarrierChecks = Record<BarrierId, BarrierCheck>;

export type ServerConstants = {
    WS_SIGNAL: {
        connection: string,
        message: string,
        close: string,
    },
    DEFAULT_MOVE_RULES: DefaultMoveRule[],
    BARRIER_CHECKS: BarrierChecks,
    PLAYER_IDS: PlayerId[],
    PLAYER_STATE: PlayerState,
}