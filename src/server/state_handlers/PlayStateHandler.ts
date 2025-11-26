import {
    ChatEntry, GameSetup, ZoneName, ItemSupplies, MarketOffer, MarketSlotKey, Player, PlayerColor, PlayState,
    TempleState, Trade, TreasuryOffer, Metal, DiceSix, TradeGood, Rival, ShipBearings, Coordinates, Phase, Unique,
} from '~/shared_types';
import { PlayerCountables, ObjectHandler } from '~/server_types';
import { writable, Writable, readable, Readable, arrayWritable, ArrayWritable } from './library';

export class PlayStateHandler implements Unique<ObjectHandler<PlayState>>{
    private serverName: Readable<string>;
    private gameId: Readable<string>;
    private sessionOwner: Readable<PlayerColor>;
    private setup: Readable<GameSetup>;
    private sessionPhase: Readable<Phase.play>;
    private hasGameEnded: Writable<boolean>;
    private gameResults: Writable<Array<PlayerCountables>>;
    private players: ArrayWritable<Player>;
    private market: Writable<MarketOffer>;
    private treasury: Writable<TreasuryOffer>;
    private temple: Writable<TempleState>;
    private chat: ArrayWritable<ChatEntry>;
    private itemSupplies: Writable<ItemSupplies>;
    private rival: Writable<Rival>;

    constructor(serverName: string, state: PlayState) {
        this.serverName = readable(serverName);

        const {
            gameId, sessionOwner, setup, sessionPhase, gameResults, players,
            market, treasury, temple, chat, itemSupplies, rival, hasGameEnded,
        } = state;

        this.gameId = readable(gameId);
        this.sessionOwner = readable(sessionOwner);
        this.setup = readable(setup);
        this.sessionPhase = writable(sessionPhase);
        this.hasGameEnded = writable(hasGameEnded);
        this.gameResults = writable(gameResults);
        this.players = arrayWritable(players, 'color');
        this.market = writable(market);
        this.treasury = writable(treasury);
        this.temple = writable(temple);
        this.chat = arrayWritable(chat);
        this.itemSupplies = writable(itemSupplies);
        this.rival = writable(rival);
    }

    public toDto(): PlayState {

        return {
            gameId: this.gameId.get(),
            sessionOwner: this.sessionOwner.get(),
            setup: this.setup.get(),
            sessionPhase: this.sessionPhase.get(),
            hasGameEnded: this.hasGameEnded.get(),
            gameResults: this.gameResults.get(),
            players: this.players.get(),
            market: this.market.get(),
            treasury: this.treasury.get(),
            temple: this.temple.get(),
            chat: this.chat.get(),
            itemSupplies: this.itemSupplies.get(),
            rival: this.rival.get(),
        };
    }

    public getLocationName(zoneName: ZoneName) {
        return this.setup.get().mapPairings.locationByZone[zoneName].name;
    }

    public getSessionOwner() {
        return this.sessionOwner.get();
    }

    public addChatEntry(chat: ChatEntry) {
        this.chat.addOne(chat);
    }

    public updateName(color: PlayerColor, newName: string) {
        const player = this.getPlayer(color);
        if (!player)
            return;

        player.name = newName;
        this.savePlayer(player);
    }

    public addServerMessage(message: string, as: PlayerColor | null = null) {
        this.chat.addOne({ color: as, name: this.serverName.get(), message });
    }

    // MARK: Player
    public savePlayer(player: Player) {
        this.players.updateOne(player.color, () => {
            return player;
        });
    }

    public getPlayer(color: PlayerColor) {
        return this.players.getOne(color);
    }

    public getActivePlayer() {
        return this.players.get().find(p => p.isActive) || null;
    }

    public getAllPlayers() {
        return this.players.get();
    }

    // MARK: Rival

    public updateRival(playerColor: PlayerColor) {
        this.rival.update(r => {
            if (r.isIncluded)
                r.activePlayerColor = playerColor;
            return r;
        });
    }

    public isRivalIncluded() {
        return this.rival.get().isIncluded;
    }

    public enableRivalControl(destinations: Array<ZoneName>) {
        this.rival.update(r => {
            if (r.isIncluded) {
                r.isControllable = true;
                r.destinations = destinations;
            }
            return r;
        });
    }

    public concludeRivalTurn() {
        this.rival.update(r => {
            if (r.isIncluded) {
                r.isControllable = false;
                r.influence = Math.ceil(Math.random() * 6) as DiceSix;
                r.moves = 2;
            }
            return r;
        });
    }

    public isRivalDestinationValid(target: ZoneName) {
        const rival = this.rival.get();
        return rival.isIncluded
            ? rival.destinations.includes(target)
            : false;
    }

    public rivalHasMoves() {
        const rival = this.rival.get();
        return rival.isIncluded ? rival.moves > 0 : false;
    }

    public getRivalData() {
        return this.rival.get();
    }

    public getRivalBearings() {
        const rival = this.rival.get();
        return rival.isIncluded ? rival.bearings : null;
    }

    public moveRivalShip(newBearings: ShipBearings, newDestinations: Array<ZoneName>) {
        this.rival.update(r => {
            if (r.isIncluded) {
                r.destinations = newDestinations.filter(d => d != r.bearings.seaZone);
                r.bearings = newBearings;
                r.moves -= 1;
            }
            return r;
        });
    }

    public repositionRivalShip(position: Coordinates) {
        this.rival.update(r => {
            if (r.isIncluded)
                r.bearings.position = position;
            return r;
        });
    }

    // MARK: Map
    public getPlayersByZone(zone: ZoneName): Array<Player> {
        return this.players.get()
            .filter(p => p.bearings.seaZone === zone);
    }

    public trimInfluenceByZone(zone: ZoneName, rivalInfluence: number) {
        const players = this.getPlayersByZone(zone).sort(
            (a, b) => b.influence - a.influence,
        );
        const playerThreshold = players.length ? players[0].influence : 0;
        const threshold = playerThreshold || rivalInfluence;

        const affectedPlayers = players.filter(p => p.influence == threshold);
        const trimmedInfluence = threshold - 1 as DiceSix;

        for (const player of affectedPlayers) {
            this.savePlayer({ ...player, influence: trimmedInfluence });
        }

        if (rivalInfluence === threshold) {
            this.rival.update(r => {
                if (r.isIncluded)
                    r.influence -= 1;
                return r;
            });
        }
    }

    public getLocalActions(seaZone: ZoneName) {
        return this.setup.get().mapPairings.locationByZone[seaZone].actions;
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

    public getReducedValueSlot(): MarketSlotKey {
        return this.setup.get().reducedValueSlot;
    }

    public getTempleTradeSlot(): MarketSlotKey {
        return this.setup.get().templeTradeSlot;
    }

    /**
     * @description Shifts slot contents to the right and reduces deckSize count.
     * @example (future) -> slot_1 -> slot_2 -> slot_3 -> out
     */
    public shiftMarketCards(trade: Trade) {
        this.market.update(m => {
            m.slot_3 = m.slot_2;
            m.slot_2 = m.slot_1;
            m.slot_1 = m.future;
            m.future = trade;
            m.deckSize -= 1;
            return m;
        });
    }

    public isDeckA() {
        return this.market.get().deckId === 'A';
    }

    public setLabelB() {
        this.market.update(m => {
            m.deckId = 'B';
            return m;
        });
    }

    public getTemple() {
        return this.temple.get();
    }

    public getMetalCosts() {
        const { goldCost, silverCost } = this.treasury.get();

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

    public setMetalPrices(prices: TreasuryOffer) {
        this.treasury.update(t => {
            t = prices;
            return t;
        });
    }

    /**
     * @description Loads results and sets 'ended' status.
     */
    public registerGameEnd(results: Array<PlayerCountables>) {
        this.gameResults.set(results);
        this.hasGameEnded.set(true);
    }
}
