//TODO: Research and implement namespaces for type files
import Konva from 'konva';
// TODO: Segregate client-only types to a separate file
export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type HexId = "center" | "topRight" | "right" | "bottomRight" | "bottomLeft" | "left" | "topLeft";

export type Action = "inquire" | "enroll" | "start" | "move" | "refresh" | "turn";
export type CustomEventTitle = "connected" | "action" | "update" | "error" | "info";
export type GameStatus = "empty" | "created" | "full" | "started";


export type PlayerState = {
    turnOrder: number | null,
    isActive: boolean,
    location: {
        hexId: HexId,
        position: { x: number, y: number } | null,
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

export type ClientState = {
    localPlayerId: PlayerId | null,
    isBoardDrawn: boolean,
    server: SharedState | null,
    konva: {
        localShip: {
            object: PlayerShipInterface | null
            homePosition: Coordinates,
            isDestinationValid: boolean,
        },
        opponentShips: ShipInterface[],
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
    position: Coordinates,
}

export type ActionDetails = MoveActionDetails | null;

export type EventPayload =
    | InfoEventPayload
    | ActionEventPayload
    | ErrorEventPayload
    | null;

export interface ShipInterface {
    getElement: () => Konva.Group,
    getId: () => PlayerId,
    setPosition: (coordinates: Coordinates) => void,
    setInfluence: (value: number) => void,
    destroy: () => void,
}

export type Coordinates = { x: number, y: number };

export interface PlayerShipInterface {
    switchControl: (isActivePlayer: boolean) => void,
    getElement: () => Konva.Group,
    setInfluence: (value: number) => void,
    setPosition: (coordinates: Coordinates) => void,
};

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
    EVENT: Record<CustomEventTitle, CustomEventTitle>,
};