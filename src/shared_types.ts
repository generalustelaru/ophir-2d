import { PlayerCountables } from "./server/server_types";

export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceSix = 1 | 2 | 3 | 4 | 5 | 6;
export type Coordinates = { x: number, y: number };
export type PlayerColor = "Purple" | "Yellow" | "Red" | "Green";
export type ZoneName = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type TradeGood = "gems" | "wood" | "stone" | "cloth";
export type Metal = "silver" | "gold";
export type CargoMetal = Metal | "silver_extra" | "gold_extra";
export type Currency = "coins" | "favor";
export type GoodLocationName = "quary" | "forest" | "mines" | "farms";
export type LocationName = "temple" | "market" | "treasury" | GoodLocationName;
export type LocationAction = "upgrade_hold" | "trade_goods" | "buy_metals" | "load_good" | "donate_metals";
export type GameStatus = "empty" | "created" | "full" | "started" | "ended";
export type ItemName = TradeGood | CargoMetal | "empty";
export type MarketSlotKey = "slot_1" | "slot_2" | "slot_3";
export type CargoInventory = Array<ItemName>;
export type Trade = { request: Array<TradeGood>, reward: Reward };
export type Reward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;
export type MarketDeckKey = "A" | "B";
export type ChatEntry = { id: PlayerColor|null, name: string|null, message: string };

export type ExchangeTier = {
    templeLevel: number,
    skipOnPlayerCounts: Array<number>,
    costs: ExchangeState,
}
export type ExchangeState = {
    goldCost: MetalCost,
    silverCost: MetalCost,
}

export type MetalCost = {
    coins: number,
    favor: number,
}

export type Player = {
    id: PlayerColor,
    timeStamp: number,
    isIdle: boolean,
    name: string | null,
    turnOrder: number,
    isActive: boolean,
    bearings: {
        seaZone: ZoneName,
        location: LocationName | null, //TODO: try removing null
        position: Coordinates,
    },
    favor: number,
    privilegedSailing: boolean,
    influence: DiceSix,
    moveActions: number,
    isAnchored: boolean,
    locationActions: Array<LocationAction> | null,
    allowedMoves: Array<ZoneName>,
    hasCargo: boolean,
    cargo: CargoInventory,
    feasibleTrades: Array<MarketSlotKey>
    coins: number,
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
    treasury: ExchangeState, // TODOȘ what if we get treasury outside of here?
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

export type ErrorResponse = {
    error: string,
}
/**
 * @description Shared between players and server in a session
 */
export type SharedState = {
    isStatusResponse: boolean,
    gameId: string,
    gameStatus: GameStatus,
    gameResults: null | Array<PlayerCountables>,
    sessionOwner: PlayerColor,
    availableSlots: Array<PlayerColor>,
    players: Array<Player>,
    market: MarketOffer,
    temple: TempleState,
    setup: GameSetup,
    chat: Array<ChatEntry>,
    itemSupplies: ItemSupplies,
}

export type NewState = {
    isStatusResponse: boolean,
    gameId: string | null,
    gameStatus: GameStatus,
    gameResults: null,
    sessionOwner: PlayerColor | null,
    availableSlots: Array<PlayerColor>,
    players: Array<Player>,
    market: null,
    temple: null,
    setup: null,
    chat: Array<ChatEntry>,
}

export type ResetResponse = {
    resetFrom: string | PlayerColor,
}

export type ServerMessage = ClientIdResponse | SharedState | NewState | ResetResponse | ErrorResponse;

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
export type ChatPayload = { input: string }
export type MovementPayload = { hexId: ZoneName, position: Coordinates }
export type RepositioningPayload = { repositioning: Coordinates }
export type GameSetupPayload = { setupCoordinates: Array<Coordinates> }
export type LoadGoodPayload = { tradeGood: TradeGood }
export type DropItemPayload = { item: ItemName }
export type GoodsTradePayload = { slot: MarketSlotKey, location: LocationName }
export type MetalPurchasePayload = { metal: Metal, currency: Currency }
export type MetalDonationPayload = { metal: Metal }
export type RebindClientPayload = { referenceId: string, myId: string }

type MessageFormat<A extends MessageAction, P extends MessagePayload> = {
    action: A,
    payload: P,
}
export type MessageAction = LaconicAction | VerboiseAction

export type VerboiseAction =
    | 'chat' | 'start' | 'move' | 'load_good' | 'drop_item' | 'reposition'
    | 'trade_goods' | 'buy_metals' | 'donate_metals' | 'rebind_id';
export type LaconicAction =
    | "inquire" | "enroll" | "end_turn" | "reset" | "spend_favor"
    | 'upgrade_hold' | 'get_status';
export type LaconicMessage = MessageFormat<LaconicAction, null>;
export type ChatMessage = MessageFormat<'chat', ChatPayload>;
export type StartMessage = MessageFormat<'start', GameSetupPayload>;
export type MoveMessage = MessageFormat<'move', MovementPayload>;
export type LoadGoodMessage = MessageFormat<'load_good', LoadGoodPayload>;
export type DropItemMessage = MessageFormat<'drop_item', DropItemPayload>;
export type RepositionMessage = MessageFormat<'reposition', RepositioningPayload>;
export type SellGoodsMessage = MessageFormat<'trade_goods', GoodsTradePayload>;
export type BuyMetalsMessage = MessageFormat<'buy_metals', MetalPurchasePayload>;
export type DonateMetalMessage = MessageFormat<'donate_metals', MetalDonationPayload>;
export type RebindIdMessage = MessageFormat<'rebind_id', RebindClientPayload>;
export type ClientMessage =
    | LaconicMessage | StartMessage | MoveMessage | LoadGoodMessage | DropItemMessage
    | RepositionMessage | SellGoodsMessage | BuyMetalsMessage | DonateMetalMessage
    | ChatMessage | RebindIdMessage;
export type MessagePayload =
    | null | ChatPayload | GameSetupPayload | MovementPayload | DropItemPayload
    | RepositioningPayload | GoodsTradePayload | MetalPurchasePayload
    | MetalDonationPayload | RebindClientPayload | LoadGoodPayload;
export type ClientRequest = {
    gameId: string | null,
    clientId: string | null,
    playerColor: PlayerColor | null,
    playerName: string | null,
    message: ClientMessage,
}