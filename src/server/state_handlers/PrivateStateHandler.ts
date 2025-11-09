import { Trade, ExchangeTier, ZoneName, PlayerColor, Unique } from '~/shared_types';
import { ObjectHandler, PlayerCountables, PrivateState, DestinationPackage, Deed } from '~/server_types';
import { ArrayWritable, arrayWritable, ArrayReadable, arrayReadable, Writable, writable } from './library';
import { PlayerHandler } from './PlayerHandler';

/**
 * @description Contains game session reference data for the server.
 */
export class PrivateStateHandler implements Unique<ObjectHandler<PrivateState>> {
    private destinationPackages: ArrayReadable<DestinationPackage>;
    private tradeDeck: ArrayWritable<Trade>;
    private costTiers: ArrayWritable<ExchangeTier>;
    private gameStats: ArrayWritable<PlayerCountables>;
    private turnSummary: Writable<Array<Deed>>;
    private gameTempleLevels: number;

    constructor(privateState: PrivateState) {
        this.destinationPackages = arrayReadable(privateState.destinationPackages,'from');
        this.tradeDeck = arrayWritable(privateState.tradeDeck);
        this.costTiers = arrayWritable(privateState.costTiers,'templeLevel');
        this.gameStats = arrayWritable(privateState.gameStats,'color');
        this.turnSummary = writable(privateState.turnSummary);

        this.gameTempleLevels = this.costTiers.count();
    }

    public toDto(): PrivateState {
        return {
            destinationPackages: this.destinationPackages.getAll(),
            tradeDeck: this.tradeDeck.get(),
            costTiers: this.costTiers.get(),
            gameStats: this.gameStats.get(),
            turnSummary: this.turnSummary.get(),
        };
    }

    public getDestinationPackages() {
        return this.destinationPackages.getAll();
    }

    public getDestinations(from: ZoneName) {
        return this.destinationPackages.findOne(from)!.allowed;
    }

    public getNavigatorAccess(from: ZoneName) {
        return this.destinationPackages.findOne(from)!.navigatorAccess;
    }

    public getTempleLevelCount() {
        return this.gameTempleLevels;
    }

    public drawMetalPrices() {
        return this.costTiers.drawFirst()?.treasury || null;
    }

    public updatePlayerStats(player: PlayerHandler, amount: number = 0) {
        this.gameStats.updateOne(player.getIdentity().color, (countables) => {
            countables.vp += amount;

            return {
                ...countables,
                gold: player.getCargo().filter(c => c == 'gold').length,
                silver: player.getCargo().filter(c => c == 'silver').length,
                favor: player.getFavor(),
                coins: player.getCoinAmount(),
            };
        });
    }

    public getPlayerVictoryPoints(color: PlayerColor) {
        const ps = this.gameStats.getOne(color);
        return ps ? ps.vp : 0;
    }

    public getGameStats() {
        return this.gameStats.get();
    }

    public loadTradeDeck(deck: Array<Trade>) {
        this.tradeDeck.overwrite(deck
            .map(t => { return { key: Math.random(), trade: t }; })
            .sort((a,b) => a.key - b.key)
            .map(s => s.trade),
        );
    }

    public drawTrade() {
        return this.tradeDeck.drawFirst();
    }

    public addDeed(deed: Deed) {
        this.turnSummary.update(s => {
            s.push(deed);
            return s;
        });
    }

    public getDeeds() {
        const deeds = this.turnSummary.get();
        this.turnSummary.set([]);

        return deeds;
    }
}