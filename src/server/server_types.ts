import {
    BarrierId, ZoneName, PlayerColor, EnrolmentState, Trade, LocationData, TradeGood, GoodsLocationName, MessagePayload,
    ExchangeTier, ServerMessage, State, PlayerEntity, ClientMessage, PlayerEntry, ChatEntry, SpecialistData,
    StateResponse, PlayState, LocalAction, MarketSlotKey, MetalPurchasePayload,
} from '~/shared_types';
import { WebSocket } from 'ws';
import { PlayStateHandler } from './state_handlers/PlayStateHandler';
import { PlayerHandler } from './state_handlers/PlayerHandler';
import { PrivateStateHandler } from './state_handlers/PrivateStateHandler';
import { BackupStateHandler } from './state_handlers/BackupStateHandler';


export type Probable<T> = { err: true, message: string } | { err?: false, data: T };

export type WsClient = {
    socketId: string,
    gameId: string | null,
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
    navigatorAccess: Array<ZoneName>
}

export type PlayerCountables = {
    color: PlayerColor;
    vp: number;
    gold: number;
    silver: number;
    favor: number;
    coins: number;
}

export type PlayerIdentity = {
    socketId: string,
    color: PlayerColor,
    name: string,
    turnOrder: number,
}

export type SetupDigest = {
    gameId: string,
    sessionOwner: PlayerColor,
    players: Array<PlayerEntry>,
    chat: Array<ChatEntry>,
}

export type RequestMatch = {
    player: PlayerEntity,
    message: ClientMessage,
}
export type ActionsAndDetails = {
    actions: Array<LocalAction>,
    trades: Array<MarketSlotKey>,
    purchases: Array<MetalPurchasePayload>
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
    playState: PlayStateHandler,
    privateState: PrivateStateHandler,
    backupState: BackupStateHandler,
}

export type BackupState = {
    playState: PlayState,
    privateState: PrivateState,
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
    SPECIALISTS: Array<SpecialistData>
    LOCATION_ACTIONS: Array<LocationData>,
    LOCATION_GOODS: Record<GoodsLocationName, TradeGood>,
    DEFAULT_MOVE_RULES: Array<DestinationSetupReference>,
    DEFAULT_NEW_STATE: EnrolmentState,
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
    getState: () => State;
    addChat: (entry: ChatEntry) => ServerMessage;
    updatePlayerName: (player: PlayerEntity, newName: string) => StateResponse;
}

export type SavedSession = {
    sharedState: State,
    privateState: PrivateState | null
    backupState: BackupState | null,
}