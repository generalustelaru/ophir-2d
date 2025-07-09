import { Trade, ExchangeTier, ZoneName, PlayerColor } from "../../shared_types";
import { ObjectHandler, PlayerCountables, PrivateState, DestinationPackage } from "../server_types";
import { ArrayWritable, arrayWritable, ArrayReadable, arrayReadable } from "./library";

/**
 * @description Contains game session reference data for the server.
 */
export class PrivateStateHandler implements ObjectHandler<PrivateState> {
    private destinationPackages: ArrayReadable<DestinationPackage>;
    private tradeDeck: ArrayWritable<Trade>;
    private costTiers: ArrayWritable<ExchangeTier>;
    private gameStats: ArrayWritable<PlayerCountables>;
    private gameTempleLevels: number;

    constructor(privateState: PrivateState) {
        this.destinationPackages = arrayReadable(privateState.destinationPackages,'from');
        this.tradeDeck = arrayWritable(privateState.tradeDeck);
        this.costTiers = arrayWritable(privateState.costTiers,'templeLevel');
        this.gameStats = arrayWritable(privateState.gameStats,'color');

        this.gameTempleLevels = this.costTiers.count();
    }

    public toDto(): PrivateState {
        return {
            destinationPackages: this.destinationPackages.getAll(),
            tradeDeck: this.tradeDeck.get(),
            costTiers: this.costTiers.get(),
            gameStats: this.gameStats.get(),
        }
    }

    public getDestinationPackages() {
        return this.destinationPackages.getAll();
    }

    public getDestinations(from: ZoneName) {
        return this.destinationPackages.findOne(from)!.allowed;
    }

    getTempleLevelCount() {
        return this.gameTempleLevels;
    }

    drawMetalPrices() {
        return this.costTiers.drawFirst()?.costs || null;
    }

    updateVictoryPoints(color: PlayerColor, amount: number) {
        this.gameStats.updateOne(color, (countables) => {
            countables.vp += amount;
            return countables;
        });
    }

    getGameStats() {
        return this.gameStats.get();
    }

    isTradeDeckEmpty() {
        return this.tradeDeck.count() === 0;
    }

    loadTradeDeck(deck: Array<Trade>) {
        this.tradeDeck.overwrite(deck
            .map(t => { return { key: Math.random(), trade: t } })
            .sort((a,b) => a.key - b.key)
            .map(s => s.trade)
        );
    }

    drawTrade() {
        return this.tradeDeck.drawFirst();
    }
}