//TODO: Research and implement namespaces for type files

// TODO: Research and implement enums to reduce the number of type definitions
export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type Action = "inquire" | "enroll" | "start" | "move" | "favor" |"refresh" | "turn";
export type GameStatus = "empty" | "created" | "full" | "started";

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
    allowedMoves: HexId[],
}

export type PlayerStates = Record<PlayerId, (PlayerState)>;

export type SharedState = {
    gameStatus: GameStatus,
    sessionOwner: PlayerId | null,
    availableSlots: PlayerId[],
    players: PlayerStates | null,
    setup: GameSetup | null,
}

export type GameSetup = {
    barriers: BarrierId[],
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