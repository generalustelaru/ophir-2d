import { Vector2d } from 'konva/lib/types';
import { HexId, PlayerId, SharedState, Coordinates, Action, ActionDetails, SettlementId, ManifestItem, NewState, Player, IconKey } from '../shared_types';
import Konva from 'konva';

export type Color = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };
export type SettlementData = { shape: string, fill: Color };
export type ItemData = { shape: string, fill: Color };
export type IslandData = { x: number , y: number, shape: string };
export type EventTitle = "connected"|"action"|"update"|"error"|"info"|"setup";
export type DiceSix = 1|2|3|4|5|6;

export type ClientState = {
    localPlayerId: PlayerId|null,
    isBoardDrawn: boolean,
    received: SharedState|NewState,
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
    ICON_DATA: Record<IconKey, ItemData>,
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

export interface CanvasGroupInterface {
    drawElements(): void,
    updateElements(): void,
}

export type GroupLayoutData = {
    width: number,
    height: number,
    x: number,
    setX(drift: number): GroupLayoutData,
    setWidth(width: number): GroupLayoutData,
};

export interface PlayMatInterface {
    getElement(): Konva.Group,
    updateElements(player: Player): void,
    getId(): PlayerId,
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
