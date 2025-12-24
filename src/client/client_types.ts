import {
    ZoneName, PlayerColor, Coordinates, LocationName, ItemName, Trade, MarketOffer, Player, ColorTransmission,
    Metal, TreasuryOffer, TempleState, ClientMessage, ResetResponse, VpTransmission, State,
    MovementPayload, DiceSix, MetalPurchasePayload, MetalCost, TradeGood,
} from '~/shared_types';
import Konva from 'konva';

export type ElementList = Array<Konva.Group | Konva.Shape>
export type Hue = `#${string}`;

export enum RawEvents {
    HOVER = 'HOVER',
    LEAVE = 'mouseleave',
    CLICK = 'click tap',
    DRAG_START = 'dragstart',
    DRAG_MOVE = 'dragmove',
    DRAG_END = 'dragend',
};

export type HueCombo = { dark: Hue, light: Hue, accent: Hue }
export type PlayerHueVariation = { vivid: HueCombo, muted: HueCombo }
export type HexCoordinates = { id: ZoneName, x: number, y: number };
export type IconLayer = { shape: string, fill: Hue }
export type IconName = 'empty_location'
export type LayeredIconData = {
    layer_1: IconLayer,
    layer_2: IconLayer,
    layer_3: IconLayer | null,
};
export type TempleIconData = { shapeId: number, icon: IconLayer };
export type PathData = { shape: string, fill: Hue };
export type IslandData = { x: number, y: number, shape: string };

export type LocalState = {
    playerColor: PlayerColor | null,
    vp: number,
}

export type TradeGoodSymbol = TradeGood | 'other';
export type Specification = {
    name: TradeGood
    isOmited: boolean
    isLocked: boolean
}

export enum LayerIds {
    board,
    ships,
    modals,
    overlay,
}

export type ClientConstants = {
    STAGE_AREA: { width: number, height: number },
    HUES: Record<string, Hue>,
    PLAYER_HUES: Record<PlayerColor, PlayerHueVariation>
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
    drawElements(state: State): void,
    update(state: State): void,
    disable(): void,
}

export interface DynamicGroupInterface<U> {
    getElement(): Konva.Group,
    update(update: U): void,
}

export interface DynamicModalInterface<U, S> {
    update(u: U): void,
    show(s: S): void,
}
export interface StaticModalInterface {
    show(): void,
}

export interface StaticGroupInterface {
    getElement(): Konva.Group,
}

export interface GroupFactory {
    produceElement(p?: any): Konva.Group,
}

export type GroupLayoutData = {
    width: number,
    height: number,
    x: number,
    y: number,
};

export type ColorProfile = {
    primary: Hue,
    secondary: Hue,
    tertiary: Hue | null,
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
    treasury: TreasuryOffer,
    metalSupplies: Record<Metal, number>,
}

export type TreasuryCardUpdate = {
    feasiblePurchases: Array<MetalPurchasePayload>,
    price: MetalCost,
    supply: number,
}

export type TempleUpdate = {
    trade: Trade,
    templeStatus: TempleState,
    localPlayer: Player | null,
}

export type SailAttemptArgs = {
    playerColor: PlayerColor,
    moveActions: number,
    origin: Coordinates,
    destination: MovementPayload,
    toSail: DiceSix,
    isTempleGuard: boolean,
}

export type EventFormat<T extends EventType, D> = {
    type: T,
    detail: D,
}

export enum EventType {
    identification = 'identification',
    draft = 'draft',
    start_action = 'start',
    close = 'close',
    timeout = 'timeout',
    action = 'action',
    sail_attempt = 'sail_attempt',
    error = 'error',
    info = 'info',
    reset = 'reset',
    abandon = 'abandon',
    deauthenticate = 'deauthenticate',
    state_update = 'state_update',
    vp_transmission = 'vp_transmission',
    rival_control_transmission = 'rival_control_transmission',
    start_turn = 'start_turn',
    force_turn = 'force_turn',
}

export type LaconicType =
    | EventType.draft
    | EventType.start_action
    | EventType.close
    | EventType.timeout
    | EventType.start_turn
    | EventType.rival_control_transmission
    | EventType.force_turn
    | EventType.abandon
    | EventType.deauthenticate
;

export type Event =
    | EventFormat<LaconicType, null>
    | EventFormat<EventType.action, ClientMessage>
    | EventFormat<EventType.sail_attempt, SailAttemptArgs>
    | EventFormat<EventType.error, ErrorDetail>
    | EventFormat<EventType.info, InfoDetail>
    | EventFormat<EventType.reset, ResetResponse>
    | EventFormat<EventType.state_update, State>
    | EventFormat<EventType.identification, ColorTransmission>
    | EventFormat<EventType.vp_transmission, VpTransmission>
;

export type InfoDetail = {
    text: string,
}

export type ErrorDetail = {
    message: string,
}
