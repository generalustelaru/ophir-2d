import { HexCoordinates } from "./client/client_types";
import { PlayerCountables } from "./server/server_types";

/**
 * @description Action strings require detailed standardization as they appear in intersecting types.
 */
export enum Action {
    chat = 'chat',
    start = 'start',
    move = 'move',
    move_rival = 'move_rival',
    reposition_rival = 'reposition_rival',
    shift_market = 'shift_market',
    end_rival_turn = 'end_rival_turn',
    load_good = 'load_good',
    drop_item = 'drop_item',
    reposition = 'reposition',
    make_trade = 'make_trade',
    buy_metals = 'buy_metals',
    donate_metals = 'donate_metals',
    rebind_id = 'rebind_id',
    inquire = "inquire",
    enroll = "enroll",
    end_turn = "end_turn",
    reset = "reset",
    spend_favor = "spend_favor",
    upgrade_cargo = 'upgrade_cargo',
    get_status = 'get_status',
}
export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceSix = 1 | 2 | 3 | 4 | 5 | 6;
export type Coordinates = { x: number, y: number };
export type PlayerColor = "Purple" | "Yellow" | "Red" | "Green";
export type ZoneName = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type TradeGood = "gems" | "wood" | "stone" | "cloth";
export type Metal = "silver" | "gold";
export type CargoMetal = Metal | "silver_extra" | "gold_extra";
export type Currency = "coins" | "favor";
export type GoodsLocationName = "quary" | "forest" | "mines" | "farms";
export type LocationName = "temple" | "market" | "treasury" | GoodsLocationName;
export type LocationAction =
    | Action.upgrade_cargo | Action.make_trade | Action.buy_metals
    | Action.load_good | Action.donate_metals;
export type GameStatus = "empty" | "created" | "full" | "started" | "ended";
export type ItemName = TradeGood | CargoMetal | "empty";
export type MarketSlotKey = "slot_1" | "slot_2" | "slot_3";
export type Trade = { request: Array<TradeGood>, reward: Reward };
export type Reward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;
export type MarketDeckKey = "A" | "B";
export type ChatEntry = { id: PlayerColor|null, name: string|null, message: string };

export type ExchangeTier = {
    templeLevel: number,
    skipOnPlayerCounts: Array<number>,
    costs: MetalPrices,
}
export type MetalPrices = {
    goldCost: MetalCost,
    silverCost: MetalCost,
}

export type MetalCost = {
    coins: number,
    favor: number,
}

export type ShipBearings = {
    seaZone: ZoneName,
    location: LocationName,
    position: Coordinates,
}

// type SetupPower = 'large_cargo'
// type InGamePower = ''
// type SpecialistName = ''

// type SpecialistData = {
//     name: SpecialistName,
//     stats: {
//         favor: number,
//         specialty: TradeGood | null
//     }
//     setup: Record<SetupPower, boolean>
//     inGame: Record<InGamePower, boolean>
// }

// type Specialist = {
//     name: SpecialistName,
//     speciality: TradeGood | null,
//     powers: Record<InGamePower, boolean>
// }
//
export type RivalData = {
    isIncluded: true,
    isControllable: boolean,
    activePlayerColor: PlayerColor,
    bearings: ShipBearings,
    moves: number,
    destinations: Array<ZoneName>,
    influence: DiceSix,
} | { isIncluded: false }

export type Player = {
    id: PlayerColor,
    timeStamp: number,
    isIdle: boolean,
    name: string,
    turnOrder: number,
    // specialist: Specialist | null,
    isActive: boolean,
    bearings: ShipBearings,
    overnightZone: ZoneName,
    favor: number,
    privilegedSailing: boolean,
    influence: DiceSix,
    moveActions: number,
    isHandlingRival: boolean,
    isAnchored: boolean,
    locationActions: Array<LocationAction>,
    destinations: Array<ZoneName>,
    cargo: Array<ItemName>,
    feasibleTrades: Array<MarketSlotKey>
    coins: number,
}

export type PlayerScaffold = {
    id: PlayerColor,
    name: string,
}

export type MarketOffer = {
    deckSize: number,
    deckId: MarketDeckKey,
    future: Trade,
    slot_1: Trade,
    slot_2: Trade,
    slot_3: Trade,
}

export type MarketFluctuations = {
    slot_1: Fluctuation,
    slot_2: Fluctuation,
    slot_3: Fluctuation,
}

export type TempleState = {
    treasury: MetalPrices, // TODO: what if we get treasury outside of here?
    currentLevel: number,
    maxLevel: number,
    levelCompletion: number,
    donations: Array<Metal>,
}

export type ItemSupplies = {
    metals: Record<Metal, number>,
    goods: Record<TradeGood, number>,
}

export type ClientIdResponse = {
    clientId: string,
}

export type GameStateResponse = {
    game: GameState,
}

export type LobbyStateResponse = {
    lobby: LobbyState,
}

export type ErrorResponse = {
    error: string,
}

/**
 * @description Shared between players and server in an ongoing session
 */
export type GameState = {
    isStatusResponse: boolean,
    gameId: string,
    gameStatus: GameStatus,
    gameResults: Array<PlayerCountables>,
    sessionOwner: PlayerColor,
    availableSlots: Array<PlayerColor>,
    players: Array<Player>,
    market: MarketOffer,
    temple: TempleState,
    setup: GameSetup,
    chat: Array<ChatEntry>,
    itemSupplies: ItemSupplies,
    rival: RivalData,
}

/**
 * @description Shared between players and server in a pending session
 */
export type LobbyState = {
    gameId: string | null,
    gameStatus: GameStatus,
    sessionOwner: PlayerColor | null,
    availableSlots: Array<PlayerColor>,
    players: Array<PlayerScaffold>,
    chat: Array<ChatEntry>,
}

export type ResetResponse = {
    resetFrom: string | PlayerColor,
}

export type ServerMessage = ClientIdResponse | GameStateResponse | LobbyStateResponse | ResetResponse | ErrorResponse;

export type LocationData = {
    name: LocationName,
    actions: Array<LocationAction>,
}

export type GameSetup = {
    barriers: Array<BarrierId>,
    mapPairings: Record<ZoneName, LocationData>,
    marketFluctuations: MarketFluctuations,
    templeTradeSlot: MarketSlotKey,
}

// MARK: COMMUNICATION

export type ChatPayload = { input: string }
export type MovementPayload = { zoneId: ZoneName, position: Coordinates }
export type RepositioningPayload = { repositioning: Coordinates }
export type GameSetupPayload = {
    hexPositions: Array<HexCoordinates>,
    startingPositions: Array<Coordinates>,
}
export type LoadGoodPayload = { tradeGood: TradeGood }
export type DropItemPayload = { item: ItemName }
export type TradePayload = { slot: MarketSlotKey, location: LocationName }
export type MetalPurchasePayload = { metal: Metal, currency: Currency }
export type MetalDonationPayload = { metal: Metal }
export type RebindClientPayload = { referenceId: string, myId: string }

export type MessagePayload =
    | null | ChatPayload | GameSetupPayload | MovementPayload | DropItemPayload
    | RepositioningPayload | TradePayload | MetalPurchasePayload
    | MetalDonationPayload | RebindClientPayload | LoadGoodPayload;

export type MessageAction = LaconicAction | VerboiseAction
type MessageFormat<A extends MessageAction, P extends MessagePayload> = {
    action: A,
    payload: P,
}

export type VerboiseAction =
    | Action.chat | Action.start | Action.move | Action.load_good | Action.drop_item | Action.reposition
    | Action.make_trade | Action.buy_metals | Action.donate_metals | Action.rebind_id;
export type LaconicAction =
    | Action.inquire | Action.enroll | Action.end_turn | Action.reset | Action.spend_favor | Action.move_rival
    | Action.upgrade_cargo | Action.get_status | Action.shift_market | Action.end_rival_turn | Action.reposition_rival;
export type LaconicMessage = MessageFormat<LaconicAction, null>;
export type ChatMessage = MessageFormat<Action.chat, ChatPayload>;
export type StartMessage = MessageFormat<Action.start, GameSetupPayload>;
export type MoveMessage = MessageFormat<Action.move | Action.move_rival, MovementPayload>;
export type MoveRivalMessage = MessageFormat<Action.move_rival, MovementPayload>;
export type LoadGoodMessage = MessageFormat<Action.load_good, LoadGoodPayload>;
export type DropItemMessage = MessageFormat<Action.drop_item, DropItemPayload>;
export type RepositionMessage = MessageFormat<Action.reposition | Action.reposition_rival, RepositioningPayload>;
export type TradeMessage = MessageFormat<Action.make_trade, TradePayload>;
export type BuyMetalsMessage = MessageFormat<Action.buy_metals, MetalPurchasePayload>;
export type DonateMetalMessage = MessageFormat<Action.donate_metals, MetalDonationPayload>;
export type RebindIdMessage = MessageFormat<Action.rebind_id, RebindClientPayload>;
export type ClientMessage =
    | LaconicMessage | StartMessage | MoveMessage | LoadGoodMessage | DropItemMessage
    | RepositionMessage | TradeMessage | BuyMetalsMessage | DonateMetalMessage
    | ChatMessage | RebindIdMessage;

export type ClientRequest = {
    gameId: string | null,
    clientId: string | null,
    playerColor: PlayerColor | null,
    playerName: string | null,
    message: ClientMessage,
}