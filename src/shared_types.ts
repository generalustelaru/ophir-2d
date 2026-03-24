import { HexCoordinates } from "~/client_types";
import { GameId } from "~/server_types";

/**
 * @description Interface wrapper hack to prevent the TSS from polluting class method references.
 */
export type Unique<T> = T & { p?: undefined }

/**
 * @description Action strings require detailed standardization as they appear in intersecting types.
 */
export enum Action {
    chat = 'chat',
    start_setup = 'start_setup',
    pick_specialist = 'pick_specialist',
    start_play = 'start_play',
    move = 'move',
    reposition = 'reposition',
    move_rival = 'move_rival',
    reposition_rival = 'reposition_rival',
    reposition_opponent = 'reposition_opponent',
    shift_market = 'shift_market',
    end_rival_turn = 'end_rival_turn',
    load_commodity = 'load_commodity',
    drop_item = 'drop_item',
    trade_commodities = 'trade',
    trade_as_chancellor = 'trade_as_chancellor',
    trade_as_peddler = 'trade_as_peddler', // not in use as local action
    donate_commodities = 'donate_commodities',
    sell_specialty = 'sell_specialty',
    buy_metal = 'buy_metal',
    donate_metal = 'donate_metal',
    enrol = 'enrol',
    change_color = 'change_color',
    undo = 'undo',
    end_turn = 'end_turn',
    declare_reset = 'declare_reset',
    spend_favor = 'spend_favor',
    upgrade_cargo = 'upgrade_cargo',
}
export type BarrierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceSix = 1 | 2 | 3 | 4 | 5 | 6;
export type Coordinates = { x: number, y: number };
export type PlayerColor = 'Purple' | 'Yellow' | 'Red' | 'Green';
export type NeutralColor = 'Neutral';
export type ZoneName = 'center' | 'topRight' | 'right' | 'bottomRight' | 'bottomLeft' | 'left' | 'topLeft';
export type Commodity = 'gems' | 'ebony' | 'marble' | 'linen';
export type Metal = 'silver' | 'gold';
export type CargoMetal = Metal | 'silver_extra' | 'gold_extra';
export type Currency = 'coins' | 'favor';
export type CommodityLocationName = 'quarry' | 'forest' | 'mines' | 'farms';
export type LocationName = 'temple' | 'market' | 'treasury' | CommodityLocationName;
export type LocalAction =
    | Action.upgrade_cargo | Action.trade_commodities | Action.sell_specialty | Action.donate_commodities | Action.donate_metal
    | Action.buy_metal | Action.load_commodity | Action.trade_as_chancellor;
export type ItemName = Commodity | CargoMetal | 'empty';
export type MarketSlotKey = 'slot_1' | 'slot_2' | 'slot_3';
export type Trade = { request: Array<Commodity>, reward: Reward };
export type Reward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;
export type MarketDeckKey = 'A' | 'B';
export type ChatEntry = { timeStamp: number, color: PlayerColor | null, name: string | null, message: string };

export type ExchangeTier = {
    templeLevel: number,
    skipOnPlayerCounts: Array<number>,
    treasury: TreasuryOffer,
}
export type TreasuryOffer = {
    goldCost: MetalCost,
    silverCost: MetalCost,
}

export type MetalCost = {
    coins: number,
    favor: number,
}

export type ShipBearings = {
    seaZone: ZoneName,
    location: LocationName,
    position: Coordinates,
}

export enum SpecialistName {
    advisor = 'advisor',
    ambassador = 'ambassador',
    chancellor = 'chancellor',
    harbormaster = 'harbormaster',
    moneychanger = 'moneychanger',
    navigator = 'navigator',
    priest = 'priest',
    temple_guard = 'temple_guard',
    postmaster = 'postmaster',
    peddler = 'peddler',
}

export type SpecialistData = {
    name: SpecialistName,
    displayName: string,
    startingFavor: number,
    specialty: Commodity | null,
    description: string,
}
export type SelectableSpecialist = SpecialistData & { owner: PlayerColor | null }

export type Specialist = Omit<SpecialistData, 'startingFavor'>

export type Rival = {
    isIncluded: true,
    isControllable: boolean,
    activePlayerColor: PlayerColor,
    bearings: ShipBearings,
    moves: number,
    destinations: Array<ZoneName>,
    influence: DiceSix,
} | { isIncluded: false }

export type PlayerEntry = {
    color: PlayerColor,
    name: string,
    isAway: boolean,
}

export type PlayerDraft = PlayerEntry & {
    turnOrder: number,
    specialist: SelectableSpecialist | null
    turnToPick: boolean, // transient property
}

export type PlayerSelection = Omit<PlayerDraft, 'turnToPick'> & {
    specialist: SelectableSpecialist,
}

export type FeasibleTrade = {
    slot: MarketSlotKey,
    missing: Array<Commodity>
}

export type Player = Omit<PlayerSelection, 'specialist'> & {
    isActive: boolean, // TODO: rename to isCurrent
    bubbleDeeds: Array<BubbleDeed>,
    mayUndo: boolean,
    bearings: ShipBearings,
    overnightZone: ZoneName,
    favor: number,
    privilegedSailing: boolean,
    specialist: Specialist,
    influence: DiceSix,
    moveActions: number,
    isHandlingRival: boolean,
    isAnchored: boolean,
    locationActions: Array<LocalAction>,
    destinations: Array<ZoneName>,
    navigatorAccess: Array<ZoneName>,
    cargo: Array<ItemName>,
    feasibleTrades: Array<FeasibleTrade>,
    feasiblePurchases: Array<FeasiblePurchase>,
    coins: number,
    turnPurchases: number,
}

export type PlayerEntity = PlayerEntry | PlayerDraft | PlayerSelection | Player;

export type MarketState = {
    deckSize: number,
    deckId: MarketDeckKey,
    future: Trade,
    slot_1: Trade,
    slot_2: Trade,
    slot_3: Trade,
}

export type MarketFluctuations = {
    slot_1: Fluctuation,
    slot_2: Fluctuation,
    slot_3: Fluctuation,
}

export type TempleState = {
    currentLevel: number,
    maxLevel: number,
    levelCompletion: number,
    donations: Array<Metal>,
}

export type ItemSupplies = {
    metals: Record<Metal, number>,
    commodities: Record<Commodity, number>,
}

// MARK: STATE
export enum Phase {
    enrolment = 'enrolment',
    setup = 'setup',
    play = 'play',
    conclusion = 'conclusion',
}

export type PlayerCountables = {
    color: PlayerColor;
    name: string,
    specialist: string,
    vp: number;
    gold: number;
    silver: number;
    favor: number;
    coins: number;
}
// TODO: revise PlayState and see if the setup sub-object can be reduced
export type PlayState = {
    gameId: GameId,
    sessionPhase: Phase.play | Phase.conclusion,
    sessionOwner: PlayerColor,
    players: Array<Player>,
    chat: Array<ChatEntry>,
    setup: GameSetup,
    gameResults: Array<PlayerCountables>,
    market: MarketState,
    treasury: TreasuryOffer,
    temple: TempleState,
    itemSupplies: ItemSupplies,
    rival: Rival,
}
export type SetupState = {
    gameId: GameId,
    sessionPhase: Phase.setup,
    sessionOwner: PlayerColor,
    players: Array<PlayerDraft>,
    chat: Array<ChatEntry>,
    setup: GamePartialSetup,
    specialists: Array<SelectableSpecialist>,
}
export type EnrolmentState = {
    gameId: GameId,
    sessionPhase: Phase.enrolment,
    sessionOwner: PlayerColor | null,
    players: Array<PlayerEntry>,
    chat: Array<ChatEntry>,
    mayDraft: boolean,
}
export type State = EnrolmentState | SetupState | PlayState;

export type LocationData = {
    name: LocationName,
    actions: Array<LocalAction>,
}

export type MapPairings = {
    locationByZone: Record<ZoneName, LocationData>
    zoneByLocation: Record<LocationName, ZoneName>
}
export type GameSetup = {
    barriers: Array<BarrierId>,
    mapPairings: MapPairings,
    marketFluctuations: MarketFluctuations,
    templeTradeSlot: MarketSlotKey,
    reducedValueSlot: MarketSlotKey
}
export type GamePartialSetup = Pick<GameSetup, 'barriers' | 'mapPairings'>

// MARK: REQUEST
export type ColorSelectionPayload = { color: PlayerColor }
export type ChatPayload = { input: string }
export type PositioningPayload = { position: Coordinates }
export type OpponentPositioningPayload = PositioningPayload & { color: PlayerColor }
export type MovementPayload = PositioningPayload & { zoneId: ZoneName }
export type GameSetupPayload = {
    hexPositions: Array<HexCoordinates>,
    startingPositions: Array<Coordinates>,
}
export type LoadCommodityPayload = { commodity: Commodity, drop: Array<ItemName> | null }
export type DropItemPayload = { item: ItemName }
export type MarketTradePayload = { slot: MarketSlotKey }
export type ChancellorMarketTradePayload = { slot: MarketSlotKey, omit: Array<Commodity> }
export type PeddlerMarketPayload = { omit: Commodity }
export type FeasiblePurchase = { metal: Metal, currency: Currency }
export type MetalPurchasePayload = FeasiblePurchase & { drop: Array<ItemName> | null }
export type MetalDonationPayload = { metal: Metal }
export type PickSpecialistPayload = { name: SpecialistName }

export enum BubbleDeed {
    move,
    rollMove,
    rollFail,
    rival,
    marketRival,
    privilege,
    gems,
    ebony,
    linen,
    marble,
    coin,
    marketCoin,
    silver,
    gold,
    vpFavor,
    metalVp,
    upgrade,
    active,
    idle,
    anchor
}

export type VerboiseAction =
    | Action.chat | Action.start_play | Action.move | Action.load_commodity | Action.drop_item | Action.reposition | Action.move_rival
    | Action.trade_commodities | Action.donate_commodities | Action.buy_metal | Action.donate_metal | Action.pick_specialist
    | Action.enrol | Action.reposition_opponent | Action.change_color | Action.trade_as_chancellor | Action.trade_as_peddler;
export type LaconicAction =
    | Action.end_turn | Action.undo | Action.declare_reset | Action.spend_favor | Action.upgrade_cargo | Action.shift_market
    | Action.end_rival_turn | Action.reposition_rival | Action.start_setup | Action.sell_specialty
export type MessageAction = LaconicAction | VerboiseAction;
export type MessagePayload =
    | null | ChatPayload | GameSetupPayload | MovementPayload | DropItemPayload | PositioningPayload
    | MarketTradePayload | ChancellorMarketTradePayload | MetalPurchasePayload | PickSpecialistPayload
    | MetalDonationPayload | LoadCommodityPayload | PeddlerMarketPayload | ColorSelectionPayload;
type MessageFormat<A extends MessageAction, P extends MessagePayload> = { action: A, payload: P }
export type LaconicMessage = MessageFormat<LaconicAction, null>;
export type EnrolMessage = MessageFormat<Action.enrol, ColorSelectionPayload>;
export type ColorSelectMessage = MessageFormat<Action.change_color, ColorSelectionPayload>;
export type ChatMessage = MessageFormat<Action.chat, ChatPayload>;
export type StartMessage = MessageFormat<Action.start_play, GameSetupPayload>;
export type MoveMessage = MessageFormat<Action.move | Action.move_rival, MovementPayload>;
export type LoadCommodityMessage = MessageFormat<Action.load_commodity, LoadCommodityPayload>;
export type DropItemMessage = MessageFormat<Action.drop_item, DropItemPayload>;
export type RepositionMessage = MessageFormat<Action.reposition | Action.reposition_rival, PositioningPayload>;
export type RepositionOpponentMessage = MessageFormat<Action.reposition_opponent , OpponentPositioningPayload>;
export type TradeMessage = MessageFormat<Action.trade_commodities, MarketTradePayload>;
export type TradeAsChancellorMessage = MessageFormat<Action.trade_as_chancellor, ChancellorMarketTradePayload>
export type TradeAsPeddlerMessage = MessageFormat<Action.trade_as_peddler, PeddlerMarketPayload>
export type DonateCommoditiesMessage = MessageFormat<Action.donate_commodities, MarketTradePayload>;
export type BuyMetalsMessage = MessageFormat<Action.buy_metal, MetalPurchasePayload>;
export type DonateMetalMessage = MessageFormat<Action.donate_metal, MetalDonationPayload>;
export type PickSpecialistMessage = MessageFormat<Action.pick_specialist, PickSpecialistPayload>;
export type ClientMessage =
    | LaconicMessage | StartMessage | MoveMessage | LoadCommodityMessage | DropItemMessage | RepositionMessage | EnrolMessage
    | PickSpecialistMessage | RepositionOpponentMessage | ColorSelectMessage | TradeAsChancellorMessage | ChatMessage
    | TradeMessage | DonateCommoditiesMessage | BuyMetalsMessage | DonateMetalMessage | TradeAsPeddlerMessage

export type ClientRequest = {
    message: ClientMessage,
}

// MARK: RESPONSE
export type ColorTransmission = { color: PlayerColor }
export type StateResponse = { state: State }
export type ResetResponse = { resetFrom: string | PlayerColor }
export type ErrorResponse = { error: string }
export type NotFoundTransmission = { notFound: null }
export type VpTransmission = { vp: number }
export type TurnNotificationTransmission = { turnStart: null }
export type FailedInfluenceRollTransmission = { rolled: DiceSix, toHit: DiceSix }
export type ForceTurnNotificationTransmission = { forceTurn: null }
export type RivalControlTransmission = { rivalControl: null }
export type ExpiredTransmission = { expired: null }
export type SocketSwitchTransmission = { switch: null }
export type ServerMessage =
    | StateResponse
    | ResetResponse
    | ErrorResponse
    | ColorTransmission
    | NotFoundTransmission
    | VpTransmission
    | TurnNotificationTransmission
    | RivalControlTransmission
    | FailedInfluenceRollTransmission
    | ForceTurnNotificationTransmission
    | ExpiredTransmission
    | SocketSwitchTransmission
;
