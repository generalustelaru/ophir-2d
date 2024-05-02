
import Konva from 'konva';

export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type PlayerId = "playerPurple" | "playerYellow" | "playerRed" | "playerGreen";
export type PlayerState = {
    turnOrder: number | null,
    isActive: boolean,
    location: {
        hexId: string,
        position: { x: number, y: number } | null,
    },
    allowedMoves: string[],
}

export type ServerState = {
    status: string,
    sessionOwner: string | null,
    availableSlots: string[],
    players: Record<PlayerId, (PlayerState)>,
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
    action: string,
    details:
        | MoveActionDetails
        | null,
}

type MoveActionDetails = {
    hexId: string,
    position: { x: number, y: number },
}

export type EventPayload =
    | InfoEventPayload
    | ActionEventPayload
    | null;

export interface PlayerShipInterface {
    switchControl: (isActivePlayer: boolean) => void,
    getElement: () => Konva.Rect,
};