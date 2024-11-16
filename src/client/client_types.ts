import { HexId, PlayerId, SharedState, Coordinates, Action, ActionDetails, SettlementId, ManifestItem, NewState, MarketKey, Contract, MarketOffer } from '../shared_types';
import Konva from 'konva';

export type Color = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };
export type SettlementData = { shape: string, fill: Color };
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
    HEX_OFFSET_DATA: Array<HexOffset>,
    ISLAND_DATA: Record<HexId, IslandData>,
    SETTLEMENT_DATA: Record<SettlementId, SettlementData>,
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

export interface DynamicGroupInterface<T> {
    getElement(): Konva.Group,
    updateElement(arg: T): void,
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

export type ContractCardUpdate = {
    contract: Contract,
    isFeasible: boolean,
}

export type LocationCardUpdate = {
    playerLocation: HexId,
    contracts: MarketOffer,
    feasibleContracts: Array<MarketKey>,
};

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
