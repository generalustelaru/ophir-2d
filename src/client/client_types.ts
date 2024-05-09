import { HexId, PlayerId, SharedState, Coordinates, Action, ActionDetails } from '../shared_types';
import Konva from 'konva';

export type HexaColor = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };
export type CustomEventTitle = "connected" | "action" | "update" | "error" | "info";

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

export type ClientConstants = {
    CONNECTION: {
        wsAddress: string
    },
    COLOR: Record<string, HexaColor>,
    HEX_OFFSET_DATA: HexOffset[],
    EVENT: Record<CustomEventTitle, CustomEventTitle>,
}

export interface ShipInterface {
    getElement: () => Konva.Group,
    getId: () => PlayerId,
    setPosition: (coordinates: Coordinates) => void,
    setInfluence: (value: number) => void,
    destroy: () => void,
}

export interface PlayerShipInterface {
    switchControl: (isActivePlayer: boolean) => void,
    getElement: () => Konva.Group,
    setInfluence: (value: number) => void,
    setPosition: (coordinates: Coordinates) => void,
}

export type EventPayload =
    | InfoEventPayload
    | ActionEventPayload
    | ErrorEventPayload
    | null;

export type InfoEventPayload = {
    text: string,
}

export type ErrorEventPayload = {
    error: string,
}

export type ActionEventPayload = {
    action: Action,
    details: ActionDetails,
}