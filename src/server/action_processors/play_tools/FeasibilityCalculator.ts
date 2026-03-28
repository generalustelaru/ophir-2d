import {
    Action, CommodityLocationName, FeasiblePurchase, FeasibleTrade, ItemName, LocalAction, MarketSlotKey, Commodity,
} from '~/shared_types';
import { ActionsAndDetails } from '~/server_types';
import { PlayStateHandler } from '../../state_handlers/PlayStateHandler';
import { PlayerHandler } from '../../state_handlers/PlayerHandler';
import { PrivateStateHandler } from '../../state_handlers/PrivateStateHandler';
import serverConstants from '~/server_constants';

const { COMMODITIES_BY_LOCATION } = serverConstants;

export class FeasibilityCalculator {

    public static determineActionsAndDetails(
        player: PlayerHandler, playState: PlayStateHandler, privateState: PrivateStateHandler,
    ): ActionsAndDetails {
        if (!player.isAnchored() || player.isFrozen())
            return { actions: [], trades: [], purchases: [] };

        const actionsByLocation = (
            FeasibilityCalculator.getDefaultActions(player, playState)
                .concat(FeasibilityCalculator.getSpecialistActions(player, playState, privateState))
                .filter(a => !privateState.getSpentActions().includes(a))
        );

        const replaceableRef = ['empty', 'marble', 'ebony', 'gems', 'linen'];
        const trades = FeasibilityCalculator.pickFeasibleTrades(player, playState);
        const purchases = FeasibilityCalculator.pickFeasiblePurchases(player, playState);

        const actions = actionsByLocation.filter(action => {
            switch (action) {
                case Action.upgrade_cargo:
                    return player.getCoinAmount() >= 2 && player.getCargo().length < 4;

                case Action.trade_commodities:
                    return player.isChancellor() ? false : trades.length;

                case Action.trade_as_chancellor:
                    return trades.length;

                case Action.sell_specialty:
                    const specialty = player.getSpecialty();
                    return !!specialty && player.getCargo().includes(specialty);

                case Action.donate_commodities:
                    return (() => {
                        const templeSlot = playState.getTempleTradeSlot();
                        const templeFeasible = trades.find(f => f.slot == templeSlot);
                        switch (true) {
                            case player.isAdvisor():
                                return trades.length;
                            case player.isPeddler():
                            case player.isChancellor():
                                return templeFeasible?.missing.length == 0;
                            default:
                                return !!templeFeasible;
                        }
                    })();

                case Action.donate_metal:
                    return player.getCargo()
                        .filter(item => ['silver', 'gold'].includes(item))
                        .length;

                case Action.buy_metal:
                    return (
                        player.hasPurchaseAllowance()
                        && purchases.length
                        && player.getCargo().filter(item => replaceableRef.includes(item)).length >= 2
                    );

                case Action.load_commodity:
                    const { location } = player.getBearings();
                    return (
                        ['quarry', 'forest', 'mines', 'farms'].includes(location)
                        && (playState.getItemSupplies()
                            .commodities[COMMODITIES_BY_LOCATION[location as CommodityLocationName]])
                        && player.getCargo().filter(item => replaceableRef.includes(item)).length >= 1
                    );

                default:
                    return false;
            }
        });

        return { actions, trades, purchases };
    }

    public static getDefaultActions(player: PlayerHandler, playState: PlayStateHandler): LocalAction[] {
        return playState.getLocalActions(player.getBearings().seaZone);
    }

    public static getSpecialistActions(
        player: PlayerHandler, playState: PlayStateHandler, privateState: PrivateStateHandler,
    ): LocalAction[] {
        const currentZone = player.getBearings().seaZone;
        const currentLocation = playState.getLocationName(currentZone);

        if (player.isPostmaster()) {
            const adjacentZones = privateState.getDestinations(currentZone);

            for (const zone of adjacentZones) {
                if (playState.getLocationName(zone) == 'temple')
                    return [Action.donate_metal];
            }
        }

        if (player.isMoneychanger() && currentLocation == 'temple')
            return [Action.trade_commodities, Action.sell_specialty];

        if (player.isChancellor() && currentLocation == 'market')
            return [Action.trade_as_chancellor];

        return [];
    }

    public static pickFeasibleTrades(player: PlayerHandler, playState: PlayStateHandler): Array<FeasibleTrade> {
        const cargo = player.getCargo();
        const market = playState.getMarket();
        const nonCommodities: Array<ItemName> = ['empty', 'gold', 'silver', 'gold_extra', 'silver_extra'];
        const keys: Array<MarketSlotKey> = ['slot_1', 'slot_2', 'slot_3'];
        const feasible: Array<FeasibleTrade> = [];

        keys.forEach(key => {
            const unfilledCommodities = market[key].request;

            for (const item of cargo) {
                if (nonCommodities.includes(item))
                    continue;

                const carriedCommodities = item as Commodity;
                const match = unfilledCommodities.indexOf(carriedCommodities);

                if (match != -1)
                    unfilledCommodities.splice(match, 1);
            }

            switch (true) {
                case player.isPeddler() && (playState.getFluctuation(key) == -1) && unfilledCommodities.length < 2:
                case player.isChancellor() && (player.getFavor() - unfilledCommodities.length >= 0):
                    feasible.push({ slot: key, missing: unfilledCommodities });
                    break;

                case unfilledCommodities.length == 0:
                    feasible.push({ slot: key, missing: [] });
            }
        });

        return feasible;
    }

    public static pickFeasiblePurchases(player: PlayerHandler, playState: PlayStateHandler): Array<FeasiblePurchase> {
        const { silver: silverCost, gold: goldCost } = playState.getMetalCosts();
        const playerCoins = player.getCoinAmount();
        const playerFavor = player.getFavor();

        const available: FeasiblePurchase[] = [];
        const { silver, gold } = playState.getItemSupplies().metals;

        if (silver) {
            if (playerFavor >= silverCost.favor)
                available.push({ metal: 'silver', currency: 'favor' });

            if (playerCoins >= silverCost.coins)
                available.push({ metal: 'silver', currency: 'coins' });
        }

        if (gold) {
            if (playerFavor >= goldCost.favor)
                available.push({ metal: 'gold', currency: 'favor' });

            if (playerCoins >= goldCost.coins)
                available.push({ metal: 'gold', currency: 'coins' });
        }

        return available;
    }
}
