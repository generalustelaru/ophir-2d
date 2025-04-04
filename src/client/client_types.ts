import {
    ZoneName, PlayerColor, PlayState, Coordinates, LocationName, ItemName,
    EnrolmentState, Trade, MarketOffer, PlayerState, Metal, MetalPrices, Currency,
    TempleState, ClientMessage, ResetResponse, ClientIdResponse,
} from '../shared_types';
import Konva from 'konva';

export type Color = `#${string}`;
export type DynamicColor = {active: Color, inactive: Color}
export type HexCoordinates = { id: ZoneName, x: number, y: number };
export type IconLayer = { shape: string, fill: Color }
export type IconName = 'empty_location'
export type LayeredIconData = {
    layer_1: IconLayer,
    layer_2: IconLayer,
    layer_3: IconLayer | null,
};
export type TempleIconData = { shapeId: number, icon: IconLayer };
export type PathData = { shape: string, fill: Color };
export type IslandData = { x: number, y: number, shape: string };

export type LocalState = {
    gameId: string | null,
    myId: string | null,
    playerColor: PlayerColor | null,
    playerName: string | null,
    isBoardDrawn: boolean,
}

export type ClientConstants = {
    DEFAULT_LOCAL_STATE: LocalState,
    COLOR: Record<string, Color>,
    COLOR_PROFILES: Record<string, ColorProfile>,
    HEX_OFFSET_DATA: Array<HexCoordinates>,
    ISLAND_DATA: Record<ZoneName, IslandData>,
    LOCATION_TOKEN_DATA: Record<LocationName, IconLayer>,
    LAYERED_ICONS: Record<IconName, LayeredIconData>
    TEMPLE_CONSTRUCTION_DATA: Array<TempleIconData>
    SHIP_DATA: {
        dimensions: { width: number, height: number }
        setupDrifts: Array<Coordinates>,
        shape: string
    },
    CARGO_ITEM_DATA: Record<ItemName, PathData>,
    ICON_DATA: Record<string, PathData>,
}

export interface HTMLHandlerInterface {
    enable(): void,
    disable(): void,
}

export interface MegaGroupInterface {
    drawElements(state: PlayState): void,
    update(state: PlayState): void,
}

export interface DynamicGroupInterface<S> {
    getElement(): Konva.Group,
    update(state: S): void,
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
    localPlayer: PlayerState | null,
    marketOffer: MarketOffer,
}

export type TreasuryUpdate = {
    localPlayer: PlayerState | null,
    tier: MetalPrices,
    metalSupplies: Record<Metal, number>,
}

export type TreasuryCardUpdate = {
    playerAmounts: { coins: number, favor: number } | null,
    treasury: { currency: Currency, price: number, metal: Metal, supply: number },
}

export type TempleUpdate = {
    trade: Trade,
    templeStatus: TempleState,
    localPlayer: PlayerState | null,
}

export type CargoBandUpdate = {
    cargo: Array<ItemName>,
    canDrop: boolean,
}

export interface ClientEventInterface<T, D> {
    type: T,
    detail: D,
}

export type LaconicType = "connected" | "start" | "close" | "timeout";
export type LaconicEvent = ClientEventInterface<LaconicType, null>;
export type ActionEvent = ClientEventInterface<"action", ClientMessage>;
export type ErrorEvent = ClientEventInterface<"error", ErrorDetail>;
export type InfoEvent = ClientEventInterface<"info", InfoDetail>;
export type ResetEvent = ClientEventInterface<"reset", ResetResponse>;
export type PlayStateUpdateEvent = ClientEventInterface<"play_update", PlayState>;
export type EnrolmentStateUpdateEvent = ClientEventInterface<"enrolment_update", EnrolmentState>;
export type IdentificationEvent = ClientEventInterface<"identification", ClientIdResponse>;

export type ClientEvent =
    | LaconicEvent | ActionEvent | ErrorEvent | InfoEvent | IdentificationEvent
    | ResetEvent | PlayStateUpdateEvent | EnrolmentStateUpdateEvent;

export type InfoDetail = {
    text: string,
}

export type ErrorDetail = {
    message: string,
}
