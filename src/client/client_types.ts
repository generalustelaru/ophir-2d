import { Vector2d } from 'konva/lib/types';
import { HexId, PlayerId, SharedState, Coordinates, Action, ActionDetails, LocationName } from '../shared_types';
import Konva from 'konva';

export type HexaColor = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };
export type ShapeDetails = { name: LocationName, island: string, settlement: string, fill: HexaColor };
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
        hexes: MapHexInterface[],
    },
}

export type ClientConstants = {
    CONNECTION: {
        wsAddress: string
    },
    COLOR: Record<string, HexaColor>,
    HEX_OFFSET_DATA: HexOffset[],
    LOCATION_DATA: ShapeDetails[],
    EVENT: Record<CustomEventTitle, CustomEventTitle>,
}

export interface MapHexInterface {
    getElement: () => Konva.RegularPolygon,
    getId: () => HexId,
    setFill: (color: HexaColor) => void,
    isIntersecting: (coordinates: Vector2d) => boolean,
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