import { HexId, PlayerId, SharedState, Coordinates, Action, ActionDetails, LocationId, ManifestItem, NewState, Trade, MarketOffer, Player } from '../shared_types';
import Konva from 'konva';

export type Color = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };
export type LocationIconData = { id: LocationId, shape: string, fill: Color };
export type PathData = { shape: string, fill: Color };
export type IslandData = { x: number, y: number, shape: string };
export type EventTitle = "connected" | "action" | "update" | "error" | "info" | "setup";

export type ClientState = {
    localPlayerId: PlayerId | null,
    isBoardDrawn: boolean,
    received: SharedState | NewState,
}

export type ClientConstants = {
    CONNECTION: {
        wsAddress: string
    },
    COLOR: Record<string, Color>,
    COLOR_PROFILES: Record<string, ColorProfile>,
    HEX_OFFSET_DATA: Array<HexOffset>,
    ISLAND_DATA: Record<HexId, IslandData>,
    LOCATION_TOKEN_DATA: Record<LocationId, LocationIconData>,
    SHIP_DATA: {
        setupDrifts: Array<Coordinates>,
        shape: string
    },
    CARGO_ITEM_DATA: Record<ManifestItem, PathData>,
    ICON_DATA: Record<string, PathData>,
}

export interface MegaGroupInterface {
    drawElements(): void,
    updateElements(): void,
}

export interface DynamicGroupInterface<S> {
    // new(state: S, ...constructorArgs: any[]): void, TODO: define the constructor args to include the update data; modify the constructors and instantiations.
    getElement(): Konva.Group,
    updateElement(state: S): void,
}

export interface StaticGroupInterface {
    getElement(): Konva.Group,
}

export type GroupLayoutData = {
    width: number,
    height: number,
    x: number,
    y: number,
};

export type ColorProfile = {
    primary: Color,
    secondary: Color,
    tertiary: Color | null,
}

export type MarketCardUpdate = {
    trade: Trade,
    isFeasible: boolean,
}

export type MarketUpdate = {
    localPlayer: Player | null,
    marketOffer: MarketOffer,
}

export type TempleUpdate = {
    trade: Trade,
    localPlayer: Player | null,
}

export type EventPayload = InfoEventPayload | ActionEventPayload | ErrorEventPayload | SetupEventPayload | null;

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
