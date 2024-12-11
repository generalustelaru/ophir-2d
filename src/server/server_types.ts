import { SharedState, BarrierId, HexId, PlayerColor, Player, NewState, ResetState, Trade, LocationData, GoodId, PickupLocationId, MetalPrices} from '../shared_types';
import { WebSocket } from 'ws';
export type WsClient = {
    clientID: string,
    gameID: string | null,
    socket: WebSocket
}

export type WsSignal = 'connection'|'message'|'close';

export type WssMessage = SharedState|NewState|ResetState|{ error: string};

export type DefaultMoveRule = {
    from: HexId;
    allowed: Array<HexId>;
    blockedBy: Array<BarrierId>;
};
export type ProcessedMoveRule = {
    from: HexId;
    allowed: Array<HexId>;
}

export type PlayerCountables = {
    id: PlayerColor;
    vp: number;
    gold: number;
    silver: number;
    favor: number;
    coins: number;
}

/**
 * @description Not to be shared with clients
*/
export type PrivateState = {
    moveRules: Array<ProcessedMoveRule>,
    tradeDeck: Array<Trade>,
    metalPrices: Array<MetalPrices>,
    gameStats: Array<PlayerCountables>,
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
    SERVER_NAME: string,
    LOCATION_ACTIONS: Array<LocationData>,
    LOCATION_GOODS: Record<PickupLocationId, GoodId>,
    DEFAULT_MOVE_RULES: Array<DefaultMoveRule>,
    DEFAULT_NEW_STATE: NewState,
    RESET_STATE: ResetState,
    BARRIER_CHECKS: BarrierChecks,
    PLAYER_IDS: Array<PlayerColor>,
    DEFAULT_PLAYER_STATE: Player,
    TRADE_DECK_A: Array<Trade>,
    TRADE_DECK_B: Array<Trade>,
    METAL_PRICES: Array<MetalPrices>,
}