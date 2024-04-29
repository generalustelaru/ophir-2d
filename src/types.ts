
import Konva from 'konva';

export type PlayerState = {
    location: Location,
    allowedMoves: Location[],
}

export type ServerState = {
    status: string,
    sessionOwner: string | null,
    availableSlots: string[],
    players: Record<string, PlayerState>,
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

export interface HTMLHandlerInterface {
    element: HTMLButtonElement | HTMLSelectElement,
    callback: (() => void) | null,
    enable: () => void,
    disable: () => void,
}

export interface UiInterface extends ServiceInterface {
    createButton: HTMLHandlerInterface,
    joinButton: HTMLHandlerInterface,
    startButton: HTMLHandlerInterface,
    playerColorSelect: HTMLHandlerInterface,
    setInfo: (text: string) => void,
    updatePreSessionUi: () => void,
}

export interface EventHandlerInterface {
    commService: CommunicationInterface,
    mapBoardService: MapBoardInterface,
    uiService: UiInterface,
}
