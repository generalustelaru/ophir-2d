import {
    ZoneName, PlayerColor, PlayState, Coordinates, LocationName, ItemName,
    EnrolmentState, Trade, MarketOffer, Player, Metal, MetalPrices, Currency,
    TempleState, ClientMessage, ResetResponse, ClientIdResponse,
    SetupState,
    VpTransmission,
} from "~/shared_types";
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
    socketId: string | null,
    gameId: string | null,
    playerColor: PlayerColor | null,
    playerName: string | null,
    vp: number,
}

export type ClientConstants = {
    DEFAULT_LOCAL_STATE: LocalState,
    COLOR: Record<string, Color>,
    COLOR_PROFILES: Record<string, ColorProfile>,
    SEA_ZONE_COUNT: 7,
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
    drawElements(state: PlayState | SetupState): void,
    update(state: PlayState | SetupState): void,
    disable(): void,
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
    localPlayer: Player | null,
    marketOffer: MarketOffer,
}

export type TreasuryUpdate = {
    localPlayer: Player | null,
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
    localPlayer: Player | null,
}

export type CargoBandUpdate = {
    cargo: Array<ItemName>,
    canDrop: boolean,
}

export type EventFormat<T extends EventType, D> = {
    type: T,
    detail: D,
}

export enum EventType {
    connected = 'connected',
    draft = 'draft',
    start_action = 'start',
    close = 'close',
    timeout = 'timeout',
    action = 'action',
    error = 'error',
    info = 'info',
    reset = 'reset',
    play_update = 'play_update',
    setup_update = 'setup_update',
    enrolment_update = 'enrolment_update',
    identification = 'identification',
    vp_transmission = 'vp_transmission',
    ui_transition = 'ui_transition',
}

export type LaconicType =
    | EventType.connected
    | EventType.draft
    | EventType.start_action
    | EventType.close
    | EventType.timeout
;

export type Event =
    | EventFormat<LaconicType, null>
    | EventFormat<EventType.action, ClientMessage>
    | EventFormat<EventType.error, ErrorDetail>
    | EventFormat<EventType.info, InfoDetail>
    | EventFormat<EventType.reset, ResetResponse>
    | EventFormat<EventType.play_update, PlayState>
    | EventFormat<EventType.setup_update, SetupState>
    | EventFormat<EventType.enrolment_update, EnrolmentState>
    | EventFormat<EventType.identification, ClientIdResponse>
    | EventFormat<EventType.vp_transmission, VpTransmission>
    | EventFormat<EventType.ui_transition, TransitionDetail>
;

export type TransitionDetail = {
    element: InterfaceId,
    visible: boolean
}

export type InfoDetail = {
    text: string,
}

export type ErrorDetail = {
    message: string,
}

enum InterfaceId {
    specialistBand = 0,
}