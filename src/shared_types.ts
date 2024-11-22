
//TODO: Research and implement namespaces for type files
export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceSix = 1 | 2 | 3 | 4 | 5 | 6;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type GoodId = "gem" | "wood" | "stone" | "cloth";
export type MetalId = "silver_a" | "silver_b" | "gold_a" | "gold_b"; // metals cover two cargo spaces
export type SettlementId = "temple" | "market" | "exchange" | "quary" | "forest" | "mines" | "farms";
export type Action =
    | SettlementAction | FreeAction
    | "inquire" | "enroll" | "start" | "move" | "spend_favor" | "end_turn";
export type SettlementAction = "upgrade_hold" | "donate_goods" | "sell_goods" | "buy_metals" | "pickup_good";
export type FreeAction = "reposition" | "drop_item"
export type GameStatus = "empty" | "created" | "full" | "started";
export type ManifestItem = GoodId | MetalId | "empty";
export type MarketKey = "slot_1" | "slot_2" | "slot_3";
export type CargoManifest = Array<ManifestItem>;
export type TradeOffer = { request: Array<GoodId>, reward: PayAndReward };
export type PayAndReward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;

export type Player = {
    id: PlayerId,
    turnOrder: number,
    isActive: boolean,
    location: {
        hexId: HexId,
        position: Coordinates,
    },
    favor: number,
    hasSpentFavor: boolean,
    influence: DiceSix,
    moveActions: number,
    isAnchored: boolean,
    locationActions: Array<SettlementAction> | null,
    // locationFreeActions: Array<FreeAction>, TODO: Implement for location-sepcific actions that can be repeated on a turn (sell specialist good, donate metals, buying metals)
    allowedMoves: Array<HexId>,
    hasCargo: boolean,
    cargo: CargoManifest,
    feasibleContracts: Array<MarketKey>
    coins: number,
}

export type MarketOffer = {
    future: TradeOffer,
    slot_1: TradeOffer,
    slot_2: TradeOffer,
    slot_3: TradeOffer,
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
    market: MarketOffer,
    setup: GameSetup,
    // mapSupplies: MapSupplies, // TODO: Implement map supplies (for limiting goods and metals on the map -- 5 of each)
}

export type NewState = {
    gameStatus: GameStatus,
    sessionOwner: PlayerId | null,
    availableSlots: Array<PlayerId>,
    players: Array<Player>,
    market: null,
    setup: null,
}

export type ActionPairing = {
    id: SettlementId,
    actions: Array<SettlementAction>,
}

export type GameSetup = {
    barriers: Array<BarrierId>,
    locationPairings: Record<HexId, ActionPairing>,
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
    item: ManifestItem,
}

export type MarketSaleDetails = {
    slot: MarketKey,
}

export type ActionDetails =
    | GameSetupDetails | MovementDetails | DropItemDetails | RepositioningDetails | MarketSaleDetails | null;

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