import {
    BarrierId, ZoneName, PlayerColor, Player, NewState, Trade, LocationData,
    TradeGood, GoodsLocationName, MessagePayload, ExchangeTier
} from '../shared_types';
import { WebSocket } from 'ws';
import { SharedStateStore } from './data_classes/SharedStateStore';

export type WsClient = {
    clientID: string,
    gameID: string | null,
    socket: WebSocket
}

export type WsSignal = 'connection'|'message'|'close';

export type DefaultMoveRule = {
    from: ZoneName;
    allowed: Array<ZoneName>;
    blockedBy: Array<BarrierId>;
};
export type ProcessedMoveRule = {
    from: ZoneName;
    allowed: Array<ZoneName>;
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
    costTiers: Array<ExchangeTier>,
    gameStats: Array<PlayerCountables>,
}

export type StateBundle = {
    sharedState: SharedStateStore,
    privateState: PrivateState,
}

export type DataDigest = {
    player: Player,
    payload: MessagePayload
}

export type BarrierCheck = {
    between: Array<ZoneName>,
    incompatible: Array<BarrierId>,
};

export type BarrierChecks = Record<BarrierId, BarrierCheck>;

export type ServerConstants = {
    LOCATION_ACTIONS: Array<LocationData>,
    LOCATION_GOODS: Record<GoodsLocationName, TradeGood>,
    DEFAULT_MOVE_RULES: Array<DefaultMoveRule>,
    DEFAULT_NEW_STATE: NewState,
    BARRIER_CHECKS: BarrierChecks,
    PLAYER_IDS: Array<PlayerColor>,
    DEFAULT_PLAYER_STATE: Player,
    TRADE_DECK_A: Array<Trade>,
    TRADE_DECK_B: Array<Trade>,
    COST_TIERS: Array<ExchangeTier>,
}