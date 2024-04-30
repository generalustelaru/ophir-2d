
import Konva from 'konva';

export type PlayerState = {
    location: string,
    allowedMoves: string[],
}

export type PlayerId = "playerWhite" | "playerYellow" | "playerRed" | "playerGreen";
export type ServerState = {
    status: string,
    sessionOwner: string | null,
    availableSlots: string[],
    players: Record<string, PlayerState>,
}

export type State = {
    playerId: PlayerId | null,
    isBoardDrawn: boolean,
    server: ServerState,
    map: {
        playerShip: {
            element: Konva.Rect | null
            homePosition: { x: number, y: number }
            hoverStatus: string
        },
        opponentShips: Konva.Rect[],
        islands: Konva.RegularPolygon[],
    },
}

export type EventPayload = {
    type: string,
    detail: {
        action: string,
        details: string | null
    },
}

export interface ServiceStaticInterface {
    new (): ServiceInterface;
    getInstance(): ServiceInterface;
}
export interface ServiceInterface {
}

export interface CommunicationInterface extends ServiceInterface {
    createConnection: (address: string) => void,
    sendMessage: (action: string, details?: any) => void,
}

export interface MapBoardInterface extends ServiceInterface {
    initiateCanvas: () => void,
    drawBoard: () => void,
    updateBoard: () => void,
}

export interface UiInterface extends ServiceInterface {
    setInfo: (text: string) => void,
    updatePreSessionUi: () => void,
    disableAllElements: () => void,
}
