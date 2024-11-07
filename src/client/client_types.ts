import { Vector2d } from 'konva/lib/types';
import { HexId, PlayerId, SharedState, Coordinates, Action, ActionDetails, SettlementId, ManifestItem, CargoManifest, NewState } from '../shared_types';
import Konva from 'konva';
import { ServiceInterface } from './services/Service';

export type Color = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };
export type SettlementData = { shape: string, fill: Color };
export type ItemData = { shape: string, fill: Color };
export type IslandData = { x: number , y: number, shape: string };
export type EventTitle = "connected"|"action"|"update"|"error"|"info"|"setup";

export type ClientState = {
    localPlayerId: PlayerId|null,
    isBoardDrawn: boolean,
    sharedState: SharedState|NewState,
    konva: {
        localShip: {
            object: PlayerShipInterface|null
            homePosition: Coordinates,
            isDestinationValid: boolean,
        },
        localCargoHold: PlayMatInterface|null,
        opponentShips: Array<ShipInterface>,
        hexes: Array<MapHexInterface>,
    },
}

export type ClientConstants = {
    CONNECTION: {
        wsAddress: string
    },
    COLOR: Record<string, Color>,
    HEX_OFFSET_DATA: Array<HexOffset>,
    ISLAND_DATA: Record<HexId, IslandData>,
    SETTLEMENT_DATA: Record<SettlementId, SettlementData>,
    SHIP_DATA: {
        setupDrifts: Array<Coordinates>,
        shape: string
    },
    CARGO_ITEM_DATA: Record<ManifestItem, ItemData>,
    EVENT: Record<EventTitle, EventTitle>, // TODO: cull constants that are replaceable by types
}

export interface MapHexInterface {
    getElement(): Konva.Group,
    getId(): HexId,
    setFill(color: Color): void,
    isIntersecting(coordinates: Vector2d): boolean,
}

export interface ShipInterface {
    getElement(): Konva.Group,
    getId(): PlayerId,
    setPosition(coordinates: Coordinates): void,
    setInfluence(value: number): void,
    destroy(): void,
}

export interface PlayerShipInterface {
    switchControl(isActivePlayer: boolean): void,
    getElement(): Konva.Group,
    setInfluence(value: number): void,
    setPosition(coordinates: Coordinates): void,
}

export interface CanvasSegmentInterface extends ServiceInterface {
    drawElements(): void,
    updateElements(): void,
}

export interface PlayMatInterface {
    getElement(): Konva.Group,
    updateHold(items: CargoManifest): void,
}

export type EventPayload = InfoEventPayload|ActionEventPayload|ErrorEventPayload|SetupEventPayload|null;

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

export type SetupEventPayload = {
    playerPositions: Array<Coordinates>,
}
