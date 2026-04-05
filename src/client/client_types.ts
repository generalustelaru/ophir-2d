import {
    ZoneName, PlayerColor, Coordinates, LocationName, ItemName, Trade, MarketState, Player, PlayerIdTransmission, Metal,
    TreasuryOffer, TempleState, ClientMessage, ResetBroadcast, VpTransmission, State, MovementPayload, DiceSix,
    MetalCost, Commodity, BuyMetalsMessage, LoadCommodityMessage, FeasiblePurchase, PlayState, InfluenceRollBroadcast,
    NewRivalInfluenceBroadcast, StateBroadcast,
} from '~/shared_types';
import Konva from 'konva';

export interface Connection {
    initialize: (url: string, gameId: string) => void
    sendToServer: (message: ClientMessage) => void
}
export type ElementList = Array<Konva.Group | Konva.Shape>
export type Hue = `#${string}`;
export enum MessageType {
    INFO = 'INFO',
    ERROR = 'ERROR',
}
export enum RawEvents {
    HOVER = 'mouseenter',
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
export type IconName = 'unavailable'
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

export type DropBeforeLoadMessage = LoadCommodityMessage | BuyMetalsMessage

export type CommoditySymbol = Commodity | 'other';
export type Specification = {
    name: Commodity
    isOmited: boolean
    isLocked: boolean
}

export enum LayerIds {
    board,
    ships,
    highlights,
    modals,
}

export enum Aspect { tall = 'tall', wide = 'wide' }

type AspectData<T> = {
    [Aspect.wide]: T
    [Aspect.tall]: T
}

export type ClientConstants = {
    STAGE_AREA: AspectData<Dimensions>,
    GROUP_DIMENSIONS: { location: Dimensions, map: Dimensions, player: Dimensions }
    ROLL_SUSPENSE_MS: number
    LOCATION_PLACEMENT: AspectData<Coordinates>,
    MAP_PLACEMENT: AspectData<Coordinates>,
    PLAYER_PLACEMENT: AspectData<Coordinates>,
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
        dimensions: Dimensions
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

export interface HighlightGroupInterface {
    setPlacement(position: Coordinates): void;
    update(targets: Array<Target>): void,
}

export interface MegaGroupInterface {
    setPlacement?(position: Coordinates): void;
    drawElements(state: State): void,
    update(state: State): void,
    disable(): void,
}

export interface DynamicGroupInterface<U> {
    getElement(): Konva.Group,
    update(update: U): void,
}

export interface Flashable {
    flash(): Promise<void>,
}

export interface DynamicModalInterface<U, S> {
    update(u: U): void,
    repositionModal(aspect: Aspect): void;
    show(s: S): void,
}

export interface StaticModalInterface<S> {
    repositionModal(aspect: Aspect): void;
    show(s: S): void,
}

export interface StaticGroupInterface {
    getElement(): Konva.Group,
}

export interface GroupFactory {
    produceElement(p?: any): Konva.Group,
}

export type Dimensions = { width: number, height: number }

export type GroupLayoutData = Coordinates & Dimensions

export type ColorProfile = {
    primary: Hue,
    secondary: Hue,
    tertiary: Hue | null,
}

export type MarketCardUpdate = {
    isShift: boolean,
    trade: Trade,
    isFeasible: boolean,
}

export type MarketUpdate = {
    localPlayer: Player | null,
    market: MarketState,
    isShift: boolean,
}

export type TreasuryUpdate = {
    localPlayer: Player | null,
    treasury: TreasuryOffer,
    metalSupplies: Record<Metal, number>,
}

export type TreasuryCardUpdate = {
    feasiblePurchases: Array<FeasiblePurchase>,
    price: MetalCost,
    supply: number,
}

export type TempleUpdate = {
    trade: Trade,
    templeStatus: TempleState,
    localPlayer: Player | null,
    isShift: boolean,
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

export type DetailFormat<K extends EventKey, M> = {
    key: K,
    message: M,
}

export enum EventType {
    server = 'server',
    client = 'client',
    internal = 'internal',
}

export type Event = ServerEvent | ClientEvent | InternalEvent
export type ServerEvent = EventFormat<EventType.server, ServerDetail>
export type ClientEvent = EventFormat<EventType.client, ClientDetail>
export type InternalEvent = EventFormat<EventType.internal, InternalDetail>

export type ServerDetail =
    | DetailFormat<EventKey.reset_broadcast, ResetBroadcast>
    | DetailFormat<EventKey.state_broadcast, StateBroadcast>
    | DetailFormat<EventKey.roll_suspense_broadcast, InfluenceRollBroadcast>
    | DetailFormat<EventKey.rival_roll_broadcast, NewRivalInfluenceBroadcast>
    | DetailFormat<EventKey.player_id_transmission, PlayerIdTransmission>
    | DetailFormat<EventKey.vp_transmission, VpTransmission>
    | DetailFormat<EventKey.start_turn_transmission, null>
    | DetailFormat<EventKey.rival_control_transmission, null>
    | DetailFormat<EventKey.force_turn_transmission, null>
    | DetailFormat<EventKey.not_found_transmission, null>
    | DetailFormat<EventKey.expired_transmission, null>
    | DetailFormat<EventKey.client_switch_transmission, null>
    | DetailFormat<EventKey.ws_closed, null>
    | DetailFormat<EventKey.ws_timeout, null>
;

export type ClientDetail =
    | DetailFormat<EventKey.client_message, ClientMessage>
    | DetailFormat<EventKey.start_play, null>
    | DetailFormat<EventKey.start_setup, null>

;

export type InternalDetail =
    | DetailFormat<EventKey.tour_update, TutorialState>
    | DetailFormat<EventKey.error, string>
    | DetailFormat<EventKey.info, string>
;

export enum EventKey {
    player_id_transmission, start_play, start_setup,  ws_closed, ws_timeout, client_message, error,
    info, reset_broadcast, not_found_transmission, client_switch_transmission, expired_transmission,
    state_broadcast, tour_update, vp_transmission, rival_control_transmission, rival_roll_broadcast,
    start_turn_transmission, roll_suspense_broadcast, force_turn_transmission,
}

// MARK: TUTORIAL

// UI element identification
export enum Target {
    // Map Group
    mapGroup, topLeftZone, topRightZone, rightZone, bottomRightZone, bottomLeftZone, leftZone, centerZone,
    movesCounter, favorButton, endTurnButton, undoButton,
    // Location Group
    locationGroup, marketArea, deck,slot_1, slot_2, slot_3, fluctuation_up, fluctuation_down, temple_mark,
    treasuryArea, goldForFavor, silverForFavor, goldForCoin, silverForCoin,
    templeArea, goldCard, silverCard, templeMarketCard, upgradeButton, donationsDisplay,
    // PlayerGroup
    playerGroup, playerPlacard, influenceDie, cargoBand, specialistBand, favorDial, coinDial, vpDial, specialtyButton,
    rivalPlacard, rivalInfluence, cycleMarket, concludeRival, rivalMoves
}

/**
 * @property `highlights` Sent to every MegaGroup for activating tutorial highlights.
 */
export type InstructionHighlights = { highlights: Array<Target> }

/**
 * @description a single tutorial 'page' with associated highlights
 */
export type Instruction = InstructionHighlights & { text: string }
export type NotificationType = 'rivalControl' | 'turnStart' | 'forcedTurn' | null

/**
 * @description Bundled data for handling a tutorial step
 * @property `expecting` Condition for advancing to the next TutorialScenarioStep
 */
export type TutorialScenarioStep = {
    index: number,
    mutate: (state: PlayState, z?: ZoneName) => void // produces a new state for CanvasService consumption (branch for move)
    laconic: NotificationType // simulates additional server transmissions for laconic events
    vp?: VpTransmission // provision for payload on gaining vp
    influenceRoll?: InfluenceRollBroadcast // provision for roll result values
    rivalRoll?: NewRivalInfluenceBroadcast // provision for rival turn conclusion
    instructions: Array<Instruction> // updates CanvasService via dedicated method
    expecting: Array<ClientMessage> | null // stays in TourService for advancing validation
}

/**
 * @description Resulting digest for CanvasService
 */
export type TutorialState = {
    index: number,
    state: PlayState,
    instructions: Array<Instruction>,
}
/**
 * Sourced from server JSON, to be combined with ScenarioPartial
*/
export type ScenarioStepText = Array<string>

/**
 * In-memory object, to be combined with ScenarioTextSource
*/
export type ScenarioStepPartial =
    Omit<TutorialScenarioStep, 'instructions'>
    & { visuals: Array<InstructionHighlights> }