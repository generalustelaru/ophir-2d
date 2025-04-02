import {
    BarrierId, ZoneName, PlayerColor, LobbyState, Trade, LocationData, SpecialistName, Specialist,
    TradeGood, GoodsLocationName, MessagePayload, ExchangeTier, ServerMessage,
} from '../shared_types';
import { WebSocket } from 'ws';
import { GameStateHandler } from './object_handlers/GameStateHandler';
import { PlayerHandler } from './object_handlers/PlayerHandler';
import { PrivateStateHandler } from './object_handlers/PrivateStateHandler';

export type WsClient = {
    clientID: string,
    gameID: string | null,
    socket: WebSocket
}

export type WsDigest = {
    senderOnly: boolean,
    message: ServerMessage,
}

export type DestinationSetupReference = {
    from: ZoneName;
    allowed: Array<ZoneName>;
    blockedBy: Array<BarrierId>;
};

export type DestinationPackage = {
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
    destinationPackages: Array<DestinationPackage>,
    tradeDeck: Array<Trade>,
    costTiers: Array<ExchangeTier>,
    gameStats: Array<PlayerCountables>,
}

export type StateBundle = {
    gameState: GameStateHandler,
    privateState: PrivateStateHandler,
}

export type DataDigest = {
    player: PlayerHandler,
    payload: MessagePayload
}

export type BarrierCheck = {
    between: Array<ZoneName>,
    incompatible: Array<BarrierId>,
};

export type BarrierChecks = Record<BarrierId, BarrierCheck>;

export type ServerConstants = {
    SPECIALISTS: Record<SpecialistName, Specialist>
    LOCATION_ACTIONS: Array<LocationData>,
    LOCATION_GOODS: Record<GoodsLocationName, TradeGood>,
    DEFAULT_MOVE_RULES: Array<DestinationSetupReference>,
    DEFAULT_NEW_STATE: LobbyState,
    BARRIER_CHECKS: BarrierChecks,
    PLAYER_IDS: Array<PlayerColor>,
    TRADE_DECK_A: Array<Trade>,
    TRADE_DECK_B: Array<Trade>,
    COST_TIERS: Array<ExchangeTier>,
}

export interface ObjectHandler<T> {
    toDto: () => T,
}

export interface SessionProcessor {
    getState: () => ServerMessage
}