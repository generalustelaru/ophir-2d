import {
    ZoneName, PlayerColor, PlayState, Coordinates, LocationName, ItemName, EnrolmentState, Trade, MarketOffer, Player,
    Metal, TreasuryOffer, TempleState, ClientMessage, ResetResponse, ClientIdResponse, SetupState, VpTransmission, State,
    EnrolmentResponse, NewNameTransmission, MovementPayload, DiceSix, MetalPurchasePayload, MetalCost,
} from '~/shared_types';
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

export enum LayerIds {
    base,
    modal,
    overlay,
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

export type CargoBandUpdate = {
    cargo: Array<ItemName>,
    canDrop: boolean,
}

export type SailAttemptArgs = {
    playerColor: PlayerColor,
    moveActions: number,
    origin: Coordinates,
    destination: MovementPayload,
    toSail: DiceSix,
    isTempleGuard: boolean,
}

export type EventFormat<EventType, D> = {
    type: EventType,
    detail: D,
}

export enum EventType {
    enrolment_approval = 'enrolment_approval',
    draft = 'draft',
    start_action = 'start',
    close = 'close',
    timeout = 'timeout',
    action = 'action',
    sail_attempt = 'sail_attempt',
    error = 'error',
    info = 'info',
    reset = 'reset',
    play_update = 'play_update',
    setup_update = 'setup_update',
    enrolment_update = 'enrolment_update',
    identification = 'identification',
    vp_transmission = 'vp_transmission',
    name_transmission = 'name_transmission',
    rival_control_transmission = 'rival_control_transmission',
    start_turn = 'start_turn',
}

export type LaconicType =
    | EventType.draft
    | EventType.start_action
    | EventType.close
    | EventType.timeout
    | EventType.start_turn
    | EventType.rival_control_transmission
;

export type Event =
    | EventFormat<LaconicType, null>
    | EventFormat<EventType.action, ClientMessage>
    | EventFormat<EventType.sail_attempt, SailAttemptArgs>
    | EventFormat<EventType.error, ErrorDetail>
    | EventFormat<EventType.info, InfoDetail>
    | EventFormat<EventType.reset, ResetResponse>
    | EventFormat<EventType.play_update, PlayState>
    | EventFormat<EventType.setup_update, SetupState>
    | EventFormat<EventType.enrolment_approval, EnrolmentResponse>
    | EventFormat<EventType.enrolment_update, EnrolmentState>
    | EventFormat<EventType.identification, ClientIdResponse>
    | EventFormat<EventType.vp_transmission, VpTransmission>
    | EventFormat<EventType.name_transmission, NewNameTransmission>
;

export type InfoDetail = {
    text: string,
}

export type ErrorDetail = {
    message: string,
}
