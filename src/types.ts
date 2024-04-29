
import Konva from 'konva';

export type PlayerId = "playerWhite" | "playerYellow" | "playerRed" | "playerGreen";

export type Location =
    | 'center' | 'topRight' | 'right' | 'bottomRight'
    | 'bottomLeft' | 'left' | 'topLeft';

export type Status = "empty" | "lobby" | "full" | "started";

export type PlayerState = {
    location: Location,
    allowedMoves: Location[],
}

export type ServerState = {
    status: Status,
    sessionOwner: PlayerId | null,
    availableSlots: PlayerId[],
    players: Record<PlayerId, PlayerState> | {},
}

export type State = {
    playerId: string | null,
    isBoardDrawn: boolean,
    server: ServerState,
    map: {
        playerShip: Konva.Rect | null,
        opponentShips: Konva.Rect[],
        islands: Konva.RegularPolygon[],
    },
}