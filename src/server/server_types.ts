import { ServerState, BarrierId, HexId} from '../shared_types';

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