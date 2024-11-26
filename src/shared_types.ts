
//TODO: Research and implement namespaces for type files
export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceSix = 1 | 2 | 3 | 4 | 5 | 6;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type GoodId = "gem" | "wood" | "stone" | "cloth";
export type MetalId = "silver" | "silver_extra" | "gold" | "gold_extra"; // metals cover two cargo spaces
export type Currency = "coins" | "favor";
export type PickupLocationId = "quary" | "forest" | "mines" | "farms";
export type LocationId = "temple" | "market" | "exchange" | PickupLocationId;
export type Action =
    | LocationAction | FreeAction
    | "inquire" | "enroll" | "start" | "move" | "spend_favor" | "end_turn";
export type LocationAction = "upgrade_hold" | "donate_goods" | "sell_goods" | "buy_metals" | "pickup_good";
export type FreeAction = "reposition" | "drop_item"
export type GameStatus = "empty" | "created" | "full" | "started";
export type ItemId = GoodId | MetalId | "empty";
export type MarketKey = "slot_1" | "slot_2" | "slot_3";
export type CargoManifest = Array<ItemId>;
export type Trade = { request: Array<GoodId>, reward: Reward };
export type Reward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;
export type MarketDeckId = "A" | "B";
export type TempleLevel = {
    id: number,
    goldCost: MetalCost,
    silverCost: MetalCost,
    skipOnPlayerCount: number | null,
}

export type MetalCost = {
    coins: number,
    favor: number,
}

export type Player = {
    id: PlayerId,
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
    // locationFreeActions: Array<FreeAction>, TODO: Implement for location-sepcific actions that can be repeated on a turn (sell specialist good, donate metals, buying metals)
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

/**
 * @description Shared between players and server in a session
 */
export type SharedState = {
    gameStatus: GameStatus,
    sessionOwner: PlayerId,
    availableSlots: Array<PlayerId>,
    players: Array<Player>,
    marketOffer: MarketOffer,
    templeLevel: TempleLevel,
    setup: GameSetup,
    // mapSupplies: MapSupplies, // TODO: Implement map supplies (for limiting goods and metals on the map -- 5 of each)
}

export type NewState = {
    gameStatus: GameStatus,
    sessionOwner: PlayerId | null,
    availableSlots: Array<PlayerId>,
    players: Array<Player>,
    marketOffer: null,
    setup: null,
}

export type Location = {
    id: LocationId,
    actions: Array<LocationAction>,
}

export type GameSetup = {
    barriers: Array<BarrierId>,
    mapPairings: Record<HexId, Location>,
    marketFluctuations: MarketFluctuations,
    templeTradeSlot: MarketKey,
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

export type ActionDetails =
    | GameSetupDetails | MovementDetails | DropItemDetails | RepositioningDetails | MarketSaleDetails
    | MetalPurchaseDetails | null;

export type Coordinates = { x: number, y: number };

export type WebsocketClientMessage = {
    playerId: PlayerId | null,
    action: Action,
    details: ActionDetails,
}

export type SharedConstants = {
    CONNECTION: {
        wsAddress: string
    },
};