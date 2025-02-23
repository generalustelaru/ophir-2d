import { PlayerCountables } from "./server/server_types";

export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceSix = 1 | 2 | 3 | 4 | 5 | 6;
export type Coordinates = { x: number, y: number };
export type PlayerColor = "Purple" | "Yellow" | "Red" | "Green";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type GoodName = "gems" | "wood" | "stone" | "cloth";
export type MetalName = "silver" | "gold";
export type CargoMetalName = MetalName | "silver_extra" | "gold_extra";
export type Currency = "coins" | "favor";
export type GoodLocationName = "quary" | "forest" | "mines" | "farms";
export type LocationName = "temple" | "market" | "treasury" | GoodLocationName;
export type LocationAction = "upgrade_hold" | "trade_goods" | "buy_metals" | "load_good" | "donate_metals";
export type GameStatus = "empty" | "created" | "full" | "started" | "ended";
export type ItemName = GoodName | CargoMetalName | "empty";
export type MarketSlotKey = "slot_1" | "slot_2" | "slot_3";
export type CargoInventory = Array<ItemName>;
export type Trade = { request: Array<GoodName>, reward: Reward };
export type Reward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;
export type MarketDeckKey = "A" | "B";
export type ChatEntry = {id: PlayerColor|null, name: string|null, message: string};
export type MetalCostTier = {
    templeLevel: number,
    goldCost: MetalCost,
    silverCost: MetalCost,
    skipOnPlayerCounts: Array<number>,
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
    hexagon: {
        hexId: HexId,
        position: Coordinates,
    },
    favor: number,
    privilegedSailing: boolean,
    influence: DiceSix,
    moveActions: number,
    isAnchored: boolean,
    locationActions: Array<LocationAction> | null,
    allowedMoves: Array<HexId>,
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

export type TempleStatus = {
    tier: MetalCostTier,
    currentLevel: number,
    maxLevel: number,
    levelCompletion: number,
    donations: Array<MetalName>,
}

export type ItemSupplies = {
    metals: Record<MetalName, number>,
    goods: Record<GoodName, number>,
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
    marketOffer: MarketOffer,
    templeStatus: TempleStatus,
    setup: GameSetup,
    sessionChat: Array<ChatEntry>,
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
    marketOffer: null,
    templeStatus: null,
    setup: null,
    sessionChat: Array<ChatEntry>,
}

export type ResetResponse = {
    resetFrom: string | PlayerColor,
}

export type ServerMessage = ClientIdResponse | SharedState | NewState | ResetResponse | ErrorResponse;

export type LocationData = {
    id: LocationName,
    actions: Array<LocationAction>,
}

export type GameSetup = {
    barriers: Array<BarrierId>,
    mapPairings: Record<HexId, LocationData>,
    marketFluctuations: MarketFluctuations,
    templeTradeSlot: MarketSlotKey,
}
export type ChatPayload = { input: string }
export type MovementPayload = { hexId: HexId, position: Coordinates }
export type RepositioningPayload = { repositioning: Coordinates }
export type GameSetupPayload = { setupCoordinates: Array<Coordinates> }
export type DropItemPayload = { item: ItemName }
export type GoodsTradePayload = { slot: MarketSlotKey, location: LocationName }
export type MetalPurchasePayload = { metal: MetalName, currency: Currency }
export type MetalDonationPayload = { metal: MetalName }
export type RebindClientPayload = { referenceId: string, myId: string }

export interface MessageInterface<A, P> {
    action: A,
    payload: P,
}
export type MessageAction =
    | "inquire" | "enroll" | "end_turn" | "reset" | "spend_favor" | 'load_good' | 'upgrade_hold' | 'get_status'
    | 'chat' | 'start' | 'move' | 'drop_item' | 'reposition' | 'trade_goods' | 'buy_metals'
    | 'donate_metals' | 'rebind_id';
export type LaconicAction =
    | "inquire" | "enroll" | "end_turn" | "reset" | "spend_favor" | 'load_good'
    | 'upgrade_hold' | 'get_status';
export type LaconicMessage = MessageInterface<LaconicAction, null>;
export type ChatMessage = MessageInterface<'chat', ChatPayload>;
export type StartMessage = MessageInterface<'start', GameSetupPayload>;
export type MoveMessage = MessageInterface<'move', MovementPayload>;
export type DropItemMessage = MessageInterface<'drop_item', DropItemPayload>;
export type RepositionMessage = MessageInterface<'reposition', RepositioningPayload>;
export type SellGoodsMessage = MessageInterface<'trade_goods', GoodsTradePayload>;
export type BuyMetalsMessage = MessageInterface<'buy_metals', MetalPurchasePayload>;
export type DonateMetalMessage = MessageInterface<'donate_metals', MetalDonationPayload>;
export type RebindIdMessage = MessageInterface<'rebind_id', RebindClientPayload>;
export type ClientMessage =
    | LaconicMessage | StartMessage | MoveMessage | DropItemMessage
    | RepositionMessage | SellGoodsMessage | BuyMetalsMessage | DonateMetalMessage
    | ChatMessage | RebindIdMessage;
export type MessagePayload =
    | null | ChatPayload | GameSetupPayload | MovementPayload | DropItemPayload
    | RepositioningPayload | GoodsTradePayload | MetalPurchasePayload
    | MetalDonationPayload | RebindClientPayload;
export type ClientRequest = {
    gameId: string | null,
    clientId: string | null,
    playerColor: PlayerColor | null,
    playerName: string | null,
    message: ClientMessage,
}