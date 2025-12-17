import {
    BarrierId, ZoneName, PlayerColor, EnrolmentState, Trade, LocationData, TradeGood, GoodsLocationName, MessagePayload,
    ExchangeTier, ServerMessage, State, PlayerEntity, ClientMessage, PlayerEntry, ChatEntry, SpecialistData,
    StateResponse, PlayState, LocalAction, MetalPurchasePayload, Action, FeasibleTrade, SpecialistName, ClientRequest,
} from '~/shared_types';
import { PlayStateHandler } from './state_handlers/PlayStateHandler';
import { PlayerHandler } from './state_handlers/PlayerHandler';
import { PrivateStateHandler } from './state_handlers/PrivateStateHandler';
import { BackupStateHandler } from './state_handlers/BackupStateHandler';
import { CookieOptions } from 'express';
/** Universal identifier */
export type UserId = `user-${string}`

/** Return value wrapper with positive checks */
export type Probable<T> =
    | { err: true, ok: false, message: string }
    | { err: false, ok: true, data: T };

export enum CookieName {
    token = 'token',
}

export type AuthenticatedClientRequest = ClientRequest & {
    userId: UserId,
}

export type MatchedPlayerRequest = AuthenticatedClientRequest & {
    player: PlayerEntity
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
    name: string,
    specialist: string,
    vp: number;
    gold: number;
    silver: number;
    favor: number;
    coins: number;
}

export type PlayerIdentity = {
    userId: UserId,
    color: PlayerColor,
    name: string,
    turnOrder: number,
}

export type SetupDigest = {
    gameId: string,
    gameOwner: PlayerColor,
    players: Array<PlayerEntry>,
    chat: Array<ChatEntry>,
}

export type EnrolRequest = {
    message: ClientMessage,
    userId: UserId,
    displayName: string | null,
    player: null,
}

export type RequestMatch = {
    message: ClientMessage,
    userId: UserId,
    player: PlayerEntity,
}

export type ActionsAndDetails = {
    actions: Array<LocalAction>,
    trades: Array<FeasibleTrade>,
    purchases: Array<MetalPurchasePayload>
}

export enum TurnEvent {
    rival_handling = 'rival_handling',
    failed_move = 'failed_move',
    failed_turn = 'failed_turn',
}

export type Deed = {
    context: Action | TurnEvent,
    description: string,
}

/**
 * @description Not to be shared with clients
*/
export type PrivateState = {
    destinationPackages: Array<DestinationPackage>,
    tradeDeck: Array<Trade>,
    costTiers: Array<ExchangeTier>,
    gameStats: Array<PlayerCountables>,
    turnSummary: Array<Deed>,
    playerSpentActions: Array<LocalAction>
    playerHasMovedPreviously: boolean,
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
    refPool: Array<PlayerReference>
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
    DEFAULT_NAMES: Array<string>
    BARRIER_CHECKS: BarrierChecks,
    PLAYER_IDS: Array<PlayerColor>,
    TRADE_DECK_A: Array<Trade>,
    TRADE_DECK_B: Array<Trade>,
    COST_TIERS: Array<ExchangeTier>,
}

export type Configuration = {
    SERVER_NAME: string,
    PLAYER_IDLE_MINUTES: number,
    GAME_DELETION_HOURS: number,
    SINGLE_PLAYER: boolean,
    NO_RIVAL: boolean,
    RICH_PLAYERS: boolean,
    FAVORED_PLAYERS: boolean,
    CARGO_BONUS: 0|1|2|3,
    SHORT_GAME: boolean,
    INCLUDE: Array<SpecialistName>
}

export interface ObjectHandler<T> {
    toDto: () => T,
}

export interface ActionProcessor {
    getState: () => State;
    addChat: (entry: ChatEntry) => ServerMessage;
    updatePlayerName: (player: PlayerEntity, newName: string) => StateResponse;
    getPlayerVP: (color: PlayerColor) => number;
}

export type GameState = {
    playerReferences: Array<PlayerReference>
    sharedState: State
    privateState: PrivateState | null
    backupStates: Array<BackupState> | null
}

export type RegistrationForm = {
    userName: string,
    password: string,
    pwRetype: string,
}

export type AuthenticationForm = {
    userName: string,
    password: string,
}

export type CookieArgs = {
    value: string,
    options: CookieOptions
}

export type PlayerReference = User & {
    color: PlayerColor | null
}

export type User = {
    id: UserId,
    name: string,
    displayName: string | null,
}
export type UserRecord = User & {
    hash: string,
}

/**@property `id`: The session token also required by the user */
export type UserSession = User & {
    expiresAt: number,
}