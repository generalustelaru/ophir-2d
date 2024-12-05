import { PlayerCountables } from "./server/server_types";

export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceSix = 1 | 2 | 3 | 4 | 5 | 6;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type GoodId = "gem" | "wood" | "stone" | "cloth";
export type MetalId = "silver" | "silver_extra" | "gold" | "gold_extra"; // metals cover two cargo spaces
export type Currency = "coins" | "favor";
export type PickupLocationId = "quary" | "forest" | "mines" | "farms";
export type LocationId = "temple" | "market" | "treasury" | PickupLocationId;
export type LocationAction = "upgrade_hold" | "donate_goods" | "sell_goods" | "buy_metals" | "pickup_good" | "donate_metals";
export type GameStatus = "empty" | "created" | "full" | "started" | "ended" | "reset";
export type ItemId = GoodId | MetalId | "empty";
export type MarketKey = "slot_1" | "slot_2" | "slot_3";
export type CargoManifest = Array<ItemId>;
export type Trade = { request: Array<GoodId>, reward: Reward };
export type Reward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;
export type MarketDeckId = "A" | "B";
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
    id: PlayerId,
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

/**
 * @description Shared between players and server in a session
 */
export type SharedState = {
    gameStatus: GameStatus,
    gameResults: null | Array<PlayerCountables>,
    sessionOwner: PlayerId,
    availableSlots: Array<PlayerId>,
    players: Array<Player>,
    marketOffer: MarketOffer,
    templeStatus: TempleStatus,
    setup: GameSetup,
    sessionChat: Array<string>,
    // mapSupplies: MapSupplies, // TODO: Implement map supplies (for limiting goods and metals on the map -- 5 of each)
}

export type NewState = {
    gameStatus: GameStatus,
    gameResults: null,
    sessionOwner: PlayerId | null,
    availableSlots: Array<PlayerId>,
    players: Array<Player>,
    marketOffer: null,
    templeStatus: null,
    setup: null,
    sessionChat: Array<string>,
}

export type ResetState = {
    gameStatus: "reset",
}

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

export type Coordinates = { x: number, y: number };
export interface RequestInterface<A, D> {
    action: A,
    details: D,
}

export type LaconicAction = "inquire" | "enroll" | "end_turn" | "reset" | "spend_favor" | 'pickup_good' | 'donate_goods' | 'upgrade_hold';
export type LaconicRequest = RequestInterface<LaconicAction, null>;
export type ChatRequest = RequestInterface<'chat', ChatDetails>;
export type GameSetupRequest = RequestInterface<'start', GameSetupDetails>;
export type MovementRequest = RequestInterface<'move', MovementDetails>;
export type DropItemRequest = RequestInterface<'drop_item', DropItemDetails>;
export type RepositioningRequest = RequestInterface<'reposition', RepositioningDetails>;
export type MarketSaleRequest = RequestInterface<'sell_goods', MarketSaleDetails>;
export type MetalPurchaseRequest = RequestInterface<'buy_metals', MetalPurchaseDetails>;
export type GoodsDonationRequest = RequestInterface<'donate_goods', MarketSaleDetails>;
export type MetalDonationRequest = RequestInterface<'donate_metals', MetalDonationDetails>;
export type WsPayload =
    | LaconicRequest | GameSetupRequest | MovementRequest | DropItemRequest
    | RepositioningRequest | MarketSaleRequest | MetalPurchaseRequest | MetalDonationRequest
    | GoodsDonationRequest | ChatRequest;

export type WebsocketClientMessage = {
    playerId: PlayerId | null,
    playerName: string | null,
    payload: WsPayload,
}

export type SharedConstants = {
    CONNECTION: {
        wsAddress: string
    },
};