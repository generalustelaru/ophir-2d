//TODO: Research and implement namespaces for type files

// TODO: Research and implement enums to reduce the number of type definitions
export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type GoodId = "gem" | "wood" | "stone" | "cloth";
export type MetalId = "silver_a"| "silver_b" | "gold_a" | "gold_b"; // metals cover two cargo spaces
export type SettlementId = "temple" | "market" | "exchange" | "quary" | "forest" | "mines" | "farms";
export type Action = "inquire" | "enroll" | "start" | "move" | "favor" | "refresh" | "turn" | SettlementAction;
export type SettlementAction = "visit_temple" | "sell_goods" | "buy_metals" | "pickup_good";
export type GameStatus = "empty" | "created" | "full" | "started";
export type ManifestItem = GoodId | MetalId | "empty";
export type CargoManifest  = Array<ManifestItem>;

export type PlayerState = {
    turnOrder: number | null,
    isActive: boolean,
    location: {
        hexId: HexId,
        position: Coordinates | null,
    },
    favor: number,
    hasSpentFavor: boolean,
    influence: number,
    moveActions: number,
    isAnchored: boolean,
    allowedSettlementAction: SettlementAction | null,
    allowedMoves: HexId[],
    cargo: CargoManifest,
}

export type PlayerStates = Record<PlayerId, (PlayerState)>;

/**
 * @description Shared between players and server in a session
 */
export type SharedState = {
    gameStatus: GameStatus,
    sessionOwner: PlayerId | null,
    availableSlots: PlayerId[],
    players: PlayerStates | null,
    setup: GameSetup | null,
}

export type GameSetup = {
    barriers: BarrierId[],
    settlements: Record<HexId, SettlementId>,
}

export type MoveActionDetails = {
    hexId: HexId,
    position: Coordinates,
}

export type ActionDetails = MoveActionDetails | null;

export type Coordinates = { x: number, y: number };

export type WebsocketClientMessage = {
    playerId: PlayerId,
    action: Action,
    details: ActionDetails,
}

export type SharedConstants = {
    CONNECTION: {
        wsAddress: string
    },
    STATUS: Record<GameStatus, GameStatus>,
    ACTION: Record<Action, Action>,
};