import { ServerState, BarrierId, HexId, PlayerId, PlayerState} from '../shared_types';

export type WssMessage = ServerState | { error: string};
export type DefaultMoveRule = {
    from: HexId;
    allowed: HexId[];
    blockedBy: BarrierId[];
};
export type ProcessedMoveRule = {
    from: HexId;
    allowed: HexId[];
}

export type LocalSession = {
    moveRules: ProcessedMoveRule[],
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