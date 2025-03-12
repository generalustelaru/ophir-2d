import {
    ChatEntry, GameSetup, GameStatus, ZoneName, ItemSupplies, MarketOffer,
    MarketSlotKey, Player, PlayerColor, SharedState, TempleState, Trade,
    ExchangeState, Metal, DiceSix, TradeGood,
} from "../../shared_types";
import { PlayerCountables } from "../server_types";
import { writable, Writable, readable, Readable, arrayWritable, ArrayWritable } from "./library";

export class SharedStateStore {
    private gameId: Readable<string>;
    private sessionOwner: Readable<PlayerColor>;
    private setup: Readable<GameSetup>;
    private isStatusResponse: Writable<boolean>;
    private gameStatus: Writable<GameStatus>;
    private gameResults: Writable<null | Array<PlayerCountables>>;
    private availableSlots: Writable<Array<PlayerColor>>;
    private players: ArrayWritable<Player>;
    private market: Writable<MarketOffer>;
    private temple: Writable<TempleState>;
    private chat: ArrayWritable<ChatEntry>;
    private itemSupplies: Writable<ItemSupplies>;

    constructor(props: SharedState) {
        const {
            gameId, sessionOwner, setup, isStatusResponse, gameStatus, gameResults,
            availableSlots, players, market, temple, chat, itemSupplies
        } = props;

        this.gameId = readable(gameId);
        this.sessionOwner = readable(sessionOwner);
        this.setup = readable(setup);
        this.isStatusResponse = writable(isStatusResponse);
        this.gameStatus = writable(gameStatus);
        this.gameResults = writable(gameResults);
        this.availableSlots = writable(availableSlots);
        this.players = arrayWritable(players, 'id');
        this.market = writable(market);
        this.temple = writable(temple);
        this.chat = arrayWritable(chat);
        this.itemSupplies = writable(itemSupplies);
    }

    public toDto(): SharedState {

        return {
            gameId: this.gameId.get(),
            sessionOwner: this.sessionOwner.get(),
            setup: this.setup.get(),
            isStatusResponse: this.isStatusResponse.get(),
            gameStatus: this.gameStatus.get(),
            gameResults: this.gameResults.get(),
            availableSlots: this.availableSlots.get(),
            players: this.players.getAll(),
            market: this.market.get(),
            temple: this.temple.get(),
            chat: this.chat.getAll(),
            itemSupplies: this.itemSupplies.get(),
        }
    }

    public getLocationName(hexId: ZoneName) {
        return this.setup.get().mapPairings[hexId].name;
    }
    public getSessionOwner() {
        return this.sessionOwner.get();
    }

    public addChatEntry(chat: ChatEntry) {
        this.chat.add(chat);
    }

    // MARK: Player
    public savePlayer(player: Player) {
        this.players.update(player.id, player);
    }

    public getPlayer(id: PlayerColor) {
        return this.players.find(id);
    }

    public getActivePlayer() {
        return this.players.getAll().find(p => p.isActive) || null;
    }

    public getAllPlayers() {
        return this.players.getAll();
    }

    // MARK: Map
    public getZoneInfluenceData(zone: ZoneName): { id: PlayerColor, influence: DiceSix }[] {
        return this.players.getAll()
            .filter(p => p.bearings.seaZone === zone)
            .map(p => { return { id: p.id, influence: p.influence }});
    }

    public getLocationActions(zone: ZoneName) {
        return this.setup.get().mapPairings[zone].actions;
    }

    public getItemSupplies() {
        return this.itemSupplies.get();
    }

    public removeMetal(metal: Metal) {
        this.itemSupplies.update(s => {
            s.metals[metal] -= 1;
            return s;
        });
    }

    public returnMetal(metal: Metal) {
        this.itemSupplies.update(s => {
            s.metals[metal] += 1;
            return s;
        });
    }

    public removeTradeGood(tradeGood: TradeGood) {
        this.itemSupplies.update(s => {
            s.goods[tradeGood] -= 1;
            return s;
        });

    }

    public returnTradeGood(tradeGood: TradeGood) {
        this.itemSupplies.update(s => {
            s.goods[tradeGood] += 1;
            return s;
        });
    }
    // MARK: Market
    public getMarket() {
        return this.market.get();
    }

    public getMarketTrade(slot: MarketSlotKey) {
        return this.market.get()[slot];
    }

    public getFluctuation(slot: MarketSlotKey) {
        return this.setup.get().marketFluctuations[slot];
    }

    /**
     * @description Shifts slot contents to the right and reduces deckSize count.
     * @example (future) -> slot_1 -> slot_2 -> slot_3 -> out
     * @warning call setFutureTrade to replenish the future slot.
     */
    public shiftMarketCards() {
        this.market.update(m => {
            m.slot_3 = m.slot_2
            m.slot_2 = m.slot_1;
            m.slot_1 = m.future;
            m.deckSize -= 1;
            return m;
        })
    }

    public setFutureTrade(trade: Trade) {
        this.market.update(m => {
            m.future = trade;
            return m;
        })
    }

    public isDeckA() {
        return this.market.get().deckId;
    }

    public markDeckB() {
        this.market.update(m => {
            m.deckId = 'B';
            return m;
        })
    }

    public setGameResults(results: Array<PlayerCountables>) {
        this.gameResults.set(results);
    }

    public setGameStatus(status: GameStatus) {
        this.gameStatus.set(status);
    }

    public getTemple() {
        return this.temple.get();
    }

    public getMetalCosts() {
        const { goldCost, silverCost } = this.getTemple().treasury;

        return { gold: goldCost, silver: silverCost };
    }

    /**
     * @description Updates temple level every third donation
     * @returns Wether a new temple level is reached or the temeple is complete.
     * @warning A new a temple level requires new exchange costs.
     */
    public processMetalDonation(metal: Metal) {
        let isNewLevel = false;
        let isTempleComplete = false;

        this.temple.update(t => {
            t.donations.push(metal);

            if ((t.levelCompletion += 1) === 3) {
                t.levelCompletion = 0;
                t.currentLevel += 1;
                isNewLevel = true;
            }

            if (t.currentLevel === t.maxLevel)
                isTempleComplete = true;

            return t;
        });

        return { isNewLevel, isTempleComplete };
    }

    public setMetalCosts(prices: ExchangeState) {
        this.temple.update(t => {
            t.treasury = prices;
            return t;
        });
    }

    /**
     * @description Loads results and sets 'ended' status.
     */
    public registerGameEnd(results: PlayerCountables[]) {
        this.gameResults.set(results);
        this.gameStatus.set('ended');
    }
}
