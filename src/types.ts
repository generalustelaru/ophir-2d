
import Konva from 'konva';

export type PlayerId = "playerWhite" | "playerYellow" | "playerRed" | "playerGreen";
export type PlayerState = {
    turnOrder: number | null,
    isActive: boolean,
    location: string, // TODO: change to {hexId: string, position: {x: number, y: number}
    allowedMoves: string[],
}

export type ServerState = {
    status: string,
    sessionOwner: string | null,
    availableSlots: string[],
    players: Record<PlayerId, (PlayerState)>,
}

export type State = {
    playerId: PlayerId | null,
    isBoardDrawn: boolean,
    server: ServerState | null,
    map: {
        playerShip: {
            object: PlayerShipInterface | null
            homePosition: { x: number, y: number }
            hoverStatus: string
        },
        opponentShips: Konva.Rect[],
        islands: Konva.RegularPolygon[],
    },
}

export type InfoEventPayload = {
    text: string,
};

export type ActionEventPayload = {
    action: string,
    details:
        | MoveActionDetails
        | null,
}

type MoveActionDetails = {
    hex: string,
}

export type EventPayload =
    | InfoEventPayload
    | ActionEventPayload
    | null;

export interface PlayerShipInterface {
    switchControl: (isActivePlayer: boolean) => void,
    getElement: () => Konva.Rect,
};