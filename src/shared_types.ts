import { PlayerCountables } from "./server/server_types";

export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceSix = 1 | 2 | 3 | 4 | 5 | 6;
export type PlayerColor = "Purple" | "Yellow" | "Red" | "Green";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type GoodId = "gems" | "wood" | "stone" | "cloth";
export type MetalId = "silver" | "gold";
export type CargoMetalId = MetalId | "silver_extra" | "gold_extra";
export type Currency = "coins" | "favor";
export type PickupLocationId = "quary" | "forest" | "mines" | "farms";
export type LocationId = "temple" | "market" | "treasury" | PickupLocationId;
export type LocationAction = "upgrade_hold" | "donate_goods" | "sell_goods" | "buy_metals" | "load_good" | "donate_metals";
export type GameStatus = "empty" | "created" | "full" | "started" | "ended";
export type ItemId = GoodId | CargoMetalId | "empty";
export type MarketKey = "slot_1" | "slot_2" | "slot_3";
export type CargoManifest = Array<ItemId>;
export type Trade = { request: Array<GoodId>, reward: Reward };
export type Reward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;
export type MarketDeckId = "A" | "B";
export type ChatEntry = {id: PlayerColor|null, name: string|null, message: string};
export type MetalPrices = {
    id: number,
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
    cargo: CargoManifest,
    feasibleTrades: Array<MarketKey>
    coins: number,
}

export type MarketOffer = {
    deckSize: number,
    deckId: MarketDeckId,
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
    prices: MetalPrices,
    currentLevel: number,
    maxLevel: number,
    levelCompletion: number,
    donations: Array<MetalId>,
}

export type ItemSupplies = {
    metals: Record<MetalId, number>,
    goods: Record<GoodId, number>,
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
    id: LocationId,
    actions: Array<LocationAction>,
}

export type GameSetup = {
    barriers: Array<BarrierId>,
    mapPairings: Record<HexId, LocationData>,
    marketFluctuations: MarketFluctuations,
    templeTradeSlot: MarketKey,
}

export type ChatDetails = {
    message: string,
}

export type MovementDetails = {
    hexId: HexId,
    position: Coordinates,
}

export type RepositioningDetails = {
    repositioning: Coordinates,
}

export type GameSetupDetails = {
    setupCoordinates: Array<Coordinates>,
}

export type DropItemDetails = {
    item: ItemId,
}

export type MarketSaleDetails = {
    slot: MarketKey,
}

export type MetalPurchaseDetails = {
    metal: MetalId,
    currency: Currency,
}

export type MetalDonationDetails = {
    metal: MetalId,
}

export type RebindClientDetails = {
    referenceId: string,
    myId: string
}

export type Coordinates = { x: number, y: number };
export interface MessageInterface<A, D> {
    action: A,
    payload: D,
}

export type LaconicAction = "inquire" | "enroll" | "end_turn" | "reset" | "spend_favor" | 'load_good' | 'donate_goods' | 'upgrade_hold' | 'get_status';
export type LaconicMessage = MessageInterface<LaconicAction, null>;
export type ChatMessage = MessageInterface<'chat', ChatDetails>;
export type StartMessage = MessageInterface<'start', GameSetupDetails>;
export type MoveMessage = MessageInterface<'move', MovementDetails>;
export type DropItemMessage = MessageInterface<'drop_item', DropItemDetails>;
export type RepositionMessage = MessageInterface<'reposition', RepositioningDetails>;
export type SellGoodsMessage = MessageInterface<'sell_goods', MarketSaleDetails>;
export type BuyMetalsMessage = MessageInterface<'buy_metals', MetalPurchaseDetails>;
export type DonateGoodsMessage = MessageInterface<'donate_goods', MarketSaleDetails>;
export type DonateMetalMessage = MessageInterface<'donate_metals', MetalDonationDetails>;
export type RebindIdMessage = MessageInterface<'rebind_id', RebindClientDetails>;
export type ClientMessage =
    | LaconicMessage | StartMessage | MoveMessage | DropItemMessage
    | RepositionMessage | SellGoodsMessage | BuyMetalsMessage | DonateMetalMessage
    | DonateGoodsMessage | ChatMessage | RebindIdMessage;

export type ClientRequest = {
    gameId: string | null,
    clientId: string | null,
    playerColor: PlayerColor | null,
    playerName: string | null,
    message: ClientMessage,
}