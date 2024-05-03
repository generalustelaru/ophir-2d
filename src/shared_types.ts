
import Konva from 'konva';

export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";
export type HexOffset = { id: HexId, x: number, y: number };
export type Action = "inquire" | "enroll" | "start" | "move" | "refresh";
export type CustomEventTitle = "connected" | "action" | "update" | "error" | "info";
export type SessionStatus = "empty" | "lobby" | "full" | "started";
export type HoverHint = "valid" | "home" | "illegal";
export type HexaColor = `#${string}`;
export type PlayerState = {
    turnOrder: number | null,
    isActive: boolean,
    location: {
        hexId: HexId,
        position: { x: number, y: number } | null,
    },
    allowedMoves: HexId[],
}

export type ServerState = {
    status: SessionStatus,
    sessionOwner: PlayerId | null,
    availableSlots: PlayerId[],
    players: Record<string|PlayerId, (PlayerState)>,
    setup: {barriers: BarrierId[]}
}

export type State = {
    localPlayerId: PlayerId | null,
    isBoardDrawn: boolean,
    server: ServerState | null,
    konva: {
        localShip: {
            object: PlayerShipInterface | null
            homePosition: { x: number, y: number }
            hoverStatus: string
        },
        opponentShips: Konva.Rect[],
        hexes: Konva.RegularPolygon[],
    },
}

export type InfoEventPayload = {
    text: string,
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
    STATUS: Record<SessionStatus, SessionStatus>,
    MOVE_HINT: Record<HoverHint, HoverHint>,
    COLOR: Record<string, HexaColor>,
    HEX_OFFSET_DATA: HexOffset[],
    ACTION: Record<Action, Action>,
    EVENT: Record<CustomEventTitle, CustomEventTitle>,
};