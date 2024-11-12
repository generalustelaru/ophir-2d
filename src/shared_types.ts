
//TODO: Research and implement namespaces for type files
export type BarrierId = 1|2|3|4|5|6|7|8|9|10|11|12;
export type DiceSix = 1|2|3|4|5|6;
export type PlayerId = "playerPurple"|"playerYellow"|"playerRed"|"playerGreen";
export type HexId = "center"|"topRight"|"right"|"bottomRight"|"bottomLeft"|"left"|"topLeft";
export type GoodId = "gem"|"wood"|"stone"|"cloth";
export type MetalId = "silver_a"|"silver_b"|"gold_a"|"gold_b"; // metals cover two cargo spaces
export type SettlementId = "temple"|"market"|"exchange"|"quary"|"forest"|"mines"|"farms";
export type Action = "inquire"|"enroll"|"start"|"move"|"reposition"|"favor"|"drop_item"|"refresh"|"turn"|SettlementAction;
export type SettlementAction = "visit_temple"|"sell_goods"|"buy_metals"|"pickup_good";
export type GameStatus = "empty"|"created"|"full"|"started";
export type ManifestItem = GoodId|MetalId|"empty";
export type IconKey = "anchored"|"not_anchored"|"restricted"|"sun"|"moon"|"ocean_wave"|"favor_stamp_outer"|"favor_stamp_inner";
export type CargoManifest = Array<ManifestItem>;

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
    allowedSettlementAction: SettlementAction|null,
    allowedMoves: Array<HexId>,
    hasCargo: boolean,
    cargo: CargoManifest,
}

/**
 * @description Shared between players and server in a session
 */
export type SharedState = {
    gameStatus: GameStatus,
    sessionOwner: PlayerId,
    availableSlots: Array<PlayerId>,
    players: Array<Player>,
    setup: GameSetup,
}

export type NewState = {
    gameStatus: GameStatus,
    sessionOwner: PlayerId|null,
    availableSlots: Array<PlayerId>,
    players: Array<Player>,
    setup: null,
}

export type GameSetup = {
    barriers: Array<BarrierId>,
    settlements: Record<HexId, SettlementId>,
}

export type MoveActionDetails = {
    hexId: HexId,
    position: Coordinates,
}

export type RepositioningActionDetails = {
    repositioning: Coordinates,
}

export type GameSetupDetails = {
    setupCoordinates: Array<Coordinates>,
}

export type DropItemActionDetails = {
    item: ManifestItem,
}

export type ActionDetails = GameSetupDetails|MoveActionDetails|DropItemActionDetails|RepositioningActionDetails|null;

export type Coordinates = { x: number, y: number };

export type WebsocketClientMessage = {
    playerId: PlayerId|null,
    action: Action,
    details: ActionDetails,
}

export type SharedConstants = {
    CONNECTION: {
        wsAddress: string
    },
};