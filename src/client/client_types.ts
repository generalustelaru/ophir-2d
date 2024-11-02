import { Vector2d } from 'konva/lib/types';
import { HexId, PlayerId, SharedState, Coordinates, Action, ActionDetails, SettlementId, ItemId } from '../shared_types';
import Konva from 'konva';

export type HexaColor = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };
export type SettlementData = { shape: string, fill: HexaColor };
export type ItemData = { shape: string, fill: HexaColor };
export type IslandData = { x: number , y: number, shape: string };
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
    ISLAND_DATA: Record<HexId, (IslandData)>,
    SETTLEMENT_DATA: Record<SettlementId, SettlementData>,
    SHIP_DATA: { shape: string },
    CARGO_HOLD_DATA: Record<ItemId, ItemData>,
    EVENT: Record<CustomEventTitle, CustomEventTitle>, // TODO: cull constants that are replaceable by types
}

export interface MapHexInterface {
    getElement: () => Konva.Group,
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
