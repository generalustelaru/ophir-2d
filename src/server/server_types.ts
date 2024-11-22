import { SharedState, BarrierId, HexId, PlayerId, Player, NewState, Trade, Location} from '../shared_types';

export type WsSignal = 'connection'|'message'|'close';

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
    tradeDeck: Array<Trade>,
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
    LOCATION_ACTIONS: Array<Location>,
    DEFAULT_MOVE_RULES: Array<DefaultMoveRule>,
    BARRIER_CHECKS: BarrierChecks,
    PLAYER_IDS: Array<PlayerId>,
    DEFAULT_PLAYER_STATE: Player,
    TRADE_DECK_A: Array<Trade>,
    TRADE_DECK_B: Array<Trade>,
}