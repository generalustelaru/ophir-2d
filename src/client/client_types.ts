import { HexId, PlayerColor, SharedState, Coordinates, LocationName, ItemName, NewState, Trade, MarketOffer, Player,
    MetalName, MetalPrices, Currency, TempleStatus, ClientMessage, ResetResponse,
    ClientIdResponse
} from '../shared_types';
import Konva from 'konva';

export type Color = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };
export type LocationIconData = { shape: string, fill: Color };
export type TempleIconData = { shapeId: number, icon: LocationIconData };
export type PathData = { shape: string, fill: Color };
export type IslandData = { x: number, y: number, shape: string };

export type LocalState = {
    gameId: string | null,
    myId: string | null,
    playerColor: PlayerColor | null,
    playerName: string | null,
    isBoardDrawn: boolean,
}

export type ClientState = {
    local: LocalState,
    received: SharedState | NewState,
}

export type ClientConstants = {
    DEFAULT_LOCAL_STATE: LocalState,
    COLOR: Record<string, Color>,
    COLOR_PROFILES: Record<string, ColorProfile>,
    HEX_OFFSET_DATA: Array<HexOffset>,
    ISLAND_DATA: Record<HexId, IslandData>,
    LOCATION_TOKEN_DATA: Record<LocationName, LocationIconData>,
    TEMPLE_CONSTRUCTION_DATA: Array<TempleIconData>
    SHIP_DATA: {
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
    drawElements(): void,
    update(): void,
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
    metalPrices: MetalPrices,
}

export type TreasuryCardUpdate = {
    playerAmounts: { coins: number, favor: number } | null,
    treasury: { currency: Currency, amount: number, metal: MetalName },
}

export type TempleUpdate = {
    trade: Trade,
    templeStatus: TempleStatus,
    localPlayer: Player | null,
}

export interface ClientEventInterface<T, D> {
    type: T,
    detail: D,
}

export type LaconicType = "connected" | "update" | "start" | "close" | "timeout";
export type LaconicEvent = ClientEventInterface<LaconicType, null>;
export type ActionEvent = ClientEventInterface<"action", ClientMessage>;
export type ErrorEvent = ClientEventInterface<"error", ErrorDetail>;
export type InfoEvent = ClientEventInterface<"info", InfoDetail>;
export type ResetEvent = ClientEventInterface<"reset", ResetResponse>;
export type IdentificationEvent = ClientEventInterface<"identification", ClientIdResponse>;

export type ClientEvent = LaconicEvent | ActionEvent | ErrorEvent | InfoEvent | IdentificationEvent | ResetEvent;

export type InfoDetail = {
    text: string,
}

export type ErrorDetail = {
    message: string,
}

export type SetupDetail = {
    playerPositions: Array<Coordinates>,
}
