//TODO: Research and implement namespaces for type files
import Konva from 'konva';
// TODO: Segregate client-only types to a separate file
export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type HexOffset = { id: HexId, x: number, y: number };
export type Action = "inquire" | "enroll" | "start" | "move" | "refresh" | "turn";
export type CustomEventTitle = "connected" | "action" | "update" | "error" | "info";
export type GameStatus = "empty" | "created" | "full" | "started";
export type HoverHint = "valid" | "home" | "illegal";
export type HexaColor = `#${string}`;

export type PlayerState = {
    turnOrder: number | null,
    isActive: boolean,
    location: {
        hexId: HexId,
        position: { x: number, y: number } | null,
    },
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

export type ClientState = {
    localPlayerId: PlayerId | null,
    isBoardDrawn: boolean,
    server: SharedState | null,
    konva: {
        localShip: {
            object: PlayerShipInterface | null
            homePosition: { x: number, y: number }
            hoverStatus: HoverHint,
        },
        opponentShips: Konva.Rect[],
        hexes: Konva.RegularPolygon[],
    },
}

export type InfoEventPayload = {
    text: string,
};

export type ErrorEventPayload = {
    error: string,
};

export type ActionEventPayload = {
    action: Action,
    details: ActionDetails,
}

export type MoveActionDetails = {
    hexId: HexId,
    position: { x: number, y: number },
}

export type ActionDetails = MoveActionDetails | null;

export type EventPayload =
    | InfoEventPayload
    | ActionEventPayload
    | ErrorEventPayload
    | null;

export interface PlayerShipInterface {
    switchControl: (isActivePlayer: boolean) => void,
    getElement: () => Konva.Rect,
};

export type WebsocketClientMessage = {
    playerId: PlayerId,
    action: Action,
    details: ActionDetails,
}

export type ConstantsCollection = {
    HEX_COUNT: 7,
    CONNECTION: {
        wsAddress: string
    },
    STATUS: Record<GameStatus, GameStatus>,
    MOVE_HINT: Record<HoverHint, HoverHint>,
    COLOR: Record<string, HexaColor>,
    HEX_OFFSET_DATA: HexOffset[],
    ACTION: Record<Action, Action>,
    EVENT: Record<CustomEventTitle, CustomEventTitle>,
};