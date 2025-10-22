import { HexCoordinates } from "~/client_types";
import { PlayerCountables } from "~/server_types";

/**
 * @description Action strings require detailed standardization as they appear in intersecting types.
 */
export enum Action {
    chat = 'chat',
    start_setup = 'start_setup',
    pick_specialist = 'pick_specialist',
    start_play = 'start_play',
    move = 'move',
    move_rival = 'move_rival',
    reposition_rival = 'reposition_rival',
    shift_market = 'shift_market',
    end_rival_turn = 'end_rival_turn',
    load_good = 'load_good',
    drop_item = 'drop_item',
    reposition = 'reposition',
    sell_goods = 'sell_goods',
    donate_goods = 'donate_goods',
    sell_specialty = 'sell_specialty',
    buy_metals = 'buy_metals',
    donate_metals = 'donate_metals',
    inquire = 'inquire',
    enrol = 'enrol',
    undo = 'undo',
    end_turn = 'end_turn',
    force_turn = 'force_turn',
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
export type TradeGood = 'gems' | 'ebony' | 'marble' | 'linen';
export type Metal = 'silver' | 'gold';
export type CargoMetal = Metal | 'silver_extra' | 'gold_extra';
export type Currency = 'coins' | 'favor';
export type GoodsLocationName = 'quarry' | 'forest' | 'mines' | 'farms';
export type LocationName = 'temple' | 'market' | 'treasury' | GoodsLocationName;
export type LocalAction =
    | Action.upgrade_cargo | Action.sell_goods | Action.sell_specialty | Action.donate_goods | Action.donate_metals
    | Action.buy_metals | Action.load_good;
export type ItemName = TradeGood | CargoMetal | 'empty';
export type MarketSlotKey = 'slot_1' | 'slot_2' | 'slot_3';
export type Trade = { request: Array<TradeGood>, reward: Reward };
export type Reward = { coins: number, favorAndVp: number }
export type Fluctuation = -1 | 0 | 1;
export type MarketDeckKey = 'A' | 'B';
export type ChatEntry = { color: PlayerColor | null, name: string | null, message: string };

export type ExchangeTier = {
    templeLevel: number,
    skipOnPlayerCounts: Array<number>,
    costs: MetalPrices,
}
export type MetalPrices = {
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
    specialty: TradeGood | null,
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
    socketId: string,
    color: PlayerColor,
    name: string,
}

export type PlayerDraft = PlayerEntry & {
    turnOrder: number,
    specialist: SelectableSpecialist | null
    turnToPick: boolean, // transient property
}

export type PlayerSelection = Omit<PlayerDraft, 'turnToPick'> & {
    specialist: SelectableSpecialist,
}

export type Player = Omit<PlayerSelection, 'specialist'> & {
    timeStamp: number,
    isIdle: boolean,
    isActive: boolean,
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
    feasibleTrades: Array<MarketSlotKey>,
    feasiblePurchases: Array<MetalPurchasePayload>,
    coins: number,
    turnPurchases: number,
}

export type PlayerEntity = PlayerEntry | PlayerDraft | PlayerSelection | Player;

export type MarketOffer = {
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
    treasury: MetalPrices, // TODO: Extract treasury from TempleState
    currentLevel: number,
    maxLevel: number,
    levelCompletion: number,
    donations: Array<Metal>,
}

export type ItemSupplies = {
    metals: Record<Metal, number>,
    goods: Record<TradeGood, number>,
}

// MARK: STATE
export enum Phase {
    enrolment = 'enrolment',
    setup = 'setup',
    play = 'play',
}

export type PlayState = {
    gameId: string,
    sessionPhase: Phase.play,
    sessionOwner: PlayerColor,
    players: Array<Player>,
    chat: Array<ChatEntry>,
    setup: GameSetup,
    hasGameEnded: boolean,
    gameResults: Array<PlayerCountables>,
    market: MarketOffer,
    temple: TempleState,
    itemSupplies: ItemSupplies,
    rival: Rival,
}
export type SetupState = {
    gameId: string,
    sessionPhase: Phase.setup,
    sessionOwner: PlayerColor,
    players: Array<PlayerDraft>,
    chat: Array<ChatEntry>,
    setup: GamePartialSetup,
    specialists: Array<SelectableSpecialist>,
}
export type EnrolmentState = {
    gameId: string,
    sessionPhase: Phase.enrolment,
    sessionOwner: PlayerColor | null,
    players: Array<PlayerEntry>,
    chat: Array<ChatEntry>,
    availableSlots: Array<PlayerColor>,
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
}
export type GamePartialSetup = Pick<GameSetup, 'barriers' | 'mapPairings'>

// MARK: REQUEST
export type EnrolmentPayload = { color: PlayerColor, name: string | null }
export type ChatPayload = { input: string }
export type MovementPayload = { zoneId: ZoneName, position: Coordinates }
export type RepositioningPayload = { repositioning: Coordinates }
export type GameSetupPayload = {
    hexPositions: Array<HexCoordinates>,
    startingPositions: Array<Coordinates>,
}
export type LoadGoodPayload = { tradeGood: TradeGood }
export type DropItemPayload = { item: ItemName }
export type MarketSlotPayload = { slot: MarketSlotKey }
export type MetalPurchasePayload = { metal: Metal, currency: Currency }
export type MetalDonationPayload = { metal: Metal }
export type PickSpecialistPayload = { name: SpecialistName }

/*
undoable
    load_good
    drop_item
    buy_metal
    donate_metals
    spend_favor
    move_rival
    sell_specialty

not undoable
    sell_goods
    donate_goods

it depends
    move (on rolling or not)
    end_rival_turn (on having shifted market)

should persist
    reposition
    reposition_rival
    chat

    singleState; action

*/

export type VerboiseAction =
    | Action.chat | Action.start_play | Action.move | Action.load_good | Action.drop_item | Action.reposition
    | Action.sell_goods | Action.donate_goods | Action.buy_metals | Action.donate_metals | Action.pick_specialist
    | Action.enrol;
export type LaconicAction =
    | Action.inquire | Action.end_turn | Action.undo | Action.declare_reset | Action.spend_favor | Action.move_rival
    | Action.upgrade_cargo | Action.shift_market | Action.end_rival_turn | Action.reposition_rival | Action.start_setup
    | Action.force_turn | Action.sell_specialty;
export type MessageAction = LaconicAction | VerboiseAction;
export type MessagePayload =
    | null | ChatPayload | GameSetupPayload | MovementPayload | DropItemPayload | RepositioningPayload
    | MarketSlotPayload | MetalPurchasePayload | PickSpecialistPayload | MetalDonationPayload | EnrolmentPayload
    | LoadGoodPayload;
type MessageFormat<A extends MessageAction, P extends MessagePayload> = { action: A, payload: P }
export type LaconicMessage = MessageFormat<LaconicAction, null>;
export type EnrolMessage = MessageFormat<Action.enrol, EnrolmentPayload>;
export type ChatMessage = MessageFormat<Action.chat, ChatPayload>;
export type StartMessage = MessageFormat<Action.start_play, GameSetupPayload>;
export type MoveMessage = MessageFormat<Action.move | Action.move_rival, MovementPayload>;
export type MoveRivalMessage = MessageFormat<Action.move_rival, MovementPayload>;
export type LoadGoodMessage = MessageFormat<Action.load_good, LoadGoodPayload>;
export type DropItemMessage = MessageFormat<Action.drop_item, DropItemPayload>;
export type RepositionMessage = MessageFormat<Action.reposition | Action.reposition_rival, RepositioningPayload>;
export type SellGoodsMessage = MessageFormat<Action.sell_goods, MarketSlotPayload>;
export type DonateGoodsMessage = MessageFormat<Action.donate_goods, MarketSlotPayload>;
export type BuyMetalsMessage = MessageFormat<Action.buy_metals, MetalPurchasePayload>;
export type DonateMetalMessage = MessageFormat<Action.donate_metals, MetalDonationPayload>;
export type PickSpecialistMessage = MessageFormat<Action.pick_specialist, PickSpecialistPayload>;
export type ClientMessage =
    | LaconicMessage | StartMessage | MoveMessage | LoadGoodMessage | DropItemMessage | RepositionMessage
    | SellGoodsMessage | DonateGoodsMessage | BuyMetalsMessage | DonateMetalMessage | ChatMessage | EnrolMessage
    | PickSpecialistMessage;

export type ClientRequest = {
    gameId: string | null,
    socketId: string | null,
    playerColor: PlayerColor | null,
    playerName: string | null,
    message: ClientMessage,
}

// MARK: RESPONSE
export type ClientIdResponse = { socketId: string }
export type EnrolmentResponse = { approvedColor: PlayerColor }
export type StateResponse = { state: State }

export type ResetResponse = { resetFrom: string | PlayerColor }

export type ErrorResponse = { error: string }

export type VpTransmission = { vp: number }
export type NewNameTransmission = { newName: string }
export type TurnNotificationTransmission = { turnStart: null }

export type ServerMessage =
    | ClientIdResponse
    | StateResponse
    | ResetResponse
    | ErrorResponse
    | EnrolmentResponse
    | VpTransmission
    | NewNameTransmission
    | TurnNotificationTransmission
;
