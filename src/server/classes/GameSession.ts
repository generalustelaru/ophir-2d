import { PrivateState, ProcessedMoveRule, StateBundle, WssMessage } from "../server_types";
import { HexId, PlayerId, Player, SharedState, WebsocketClientMessage, GoodId, LocationAction, MovementDetails, DropItemDetails, DiceSix, RepositioningDetails, CargoManifest, MarketKey, ItemId, MarketSaleDetails, Trade, LocationId, PickupLocationId, MetalPurchaseDetails } from "../../shared_types";
import { ToolService } from '../services/ToolService';
import serverConstants from "../server_constants";

const { TRADE_DECK_B } = serverConstants;
type RegistryItem = { id: PlayerId, influence: DiceSix };

export class GameSession {

    private privateState: PrivateState;
    private sharedState: SharedState;
    private tools: ToolService;

    constructor(bundle: StateBundle) {
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;
        this.tools = ToolService.getInstance();
        const activePlayer = this.sharedState.players.find(player => player.isActive);

        if (!activePlayer) {
            throw new Error('No active player found');
        }

        this.setTurnStartCondition(activePlayer);
    }

    public getState(): SharedState {
        return this.sharedState;
    }

    // MARK: ACTION SWITCH
    public processAction(message: WebsocketClientMessage): WssMessage {
        const id = message.playerId;

        if (!id) {
            return { error: 'No player ID provided' };
        }

        switch (message.action) {
            case 'spend_favor':
                return this.processFavorSpending(id) ? this.sharedState : { error: `Could not process favor spending on ${id}` };
            case 'move':
                return this.processMove(message) ? this.sharedState : { error: `Could not process move on ${id}` };
            case 'reposition':
                return this.processRepositioning(message) ? this.sharedState : { error: `Could process repositioning on ${id}` };
            case 'pickup_good':
                return this.processGoodPickup(id) ? this.sharedState : { error: `Could not process pickup on ${id}` };
            case 'sell_goods':
                return this.processGoodsTrade(message) ? this.sharedState : { error: `Could not process sale sale on ${id}` };
            case 'donate_goods':
                return this.processGoodsTrade(message) ? this.sharedState : { error: `Could not process donation on ${id}` };
            case 'buy_metals':
                return this.processMetalTrade(message) ? this.sharedState : { error: `Could not process metal purchase on ${id}` };
            case 'donate_metals':
                return this.processMetalDonation(message) ? this.sharedState : { error: `Could not process donation on ${id}` };
            case 'end_turn':
                return this.processEndTurn(id) ? this.sharedState : { error: `Could not process turn end on ${id}` };
            case 'upgrade_hold':
                return this.processUpgrade(id) ? this.sharedState : { error: `Could not process upgrade on ${id}` };
            case 'drop_item':
                return this.processItemDrop(message) ? this.sharedState : { error: `Could not process item drop on ${id}` };
            default:
                return { error: `Unknown action on ${id}` };
        }
    }

    // MARK: MOVE
    private processMove(message: WebsocketClientMessage): boolean {
        const details = message.details as MovementDetails;
        const player = this.sharedState.players.find(player => player.id === message.playerId);

        if (!player) {
            return false;
        }

        const departure = player.hexagon.hexId;
        const destination = details.hexId;
        const remainingMoves = player.moveActions;
        const hexMoveRule = this.privateState.moveRules.find(rule => rule.from === departure) as ProcessedMoveRule;

        if (!hexMoveRule.allowed.includes(destination) || remainingMoves === 0) {
            return false;
        }

        player.moveActions = remainingMoves - 1;

        const registry = this.getPortRegistry(destination);
        const sailSuccess = !registry || player.privilegedSailing
            ? true
            : this.processInfluenceRoll(player, registry);

        if (sailSuccess) {
            player.hexagon = { hexId: destination, position: details.position };
            player.allowedMoves = (
                this.privateState.moveRules
                    .find(rule => rule.from === destination)?.allowed
                    .filter(move => move !== departure) as Array<HexId>
            );
            player.isAnchored = true;
            player.locationActions = this.getLocationActions(player, destination);
        }

        if (player.moveActions === 0 && !sailSuccess) {
            player.isAnchored = true;
            player.locationActions = null;
        }

        return true;
    }
    // MARK: REPOSITIONING
    private processRepositioning(message: WebsocketClientMessage): boolean {
        const details = message.details as RepositioningDetails;
        const player = this.sharedState.players.find(player => player.id === message.playerId);

        if (!player) {
            console.error(`No such player found: ${message.playerId}`);
            return false;
        }

        player.hexagon.position = details.repositioning;

        return true;
    }
    // MARK: FAVOR
    private processFavorSpending(playerId: PlayerId): boolean {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (player?.isActive && player.favor > 0 && player.privilegedSailing === false) {
            player.favor -= 1;
            player.privilegedSailing = true;
            player.isAnchored = true;

            return true;
        }

        return false;
    }
    // MARK: DROP ITEM
    private processItemDrop(message: WebsocketClientMessage): boolean {
        const details = message.details as DropItemDetails

        const player = this.sharedState.players.find(player => player.id === message.playerId);

        if (!player?.cargo || !player.cargo.includes(details.item)) {
            return false;
        }

        const manifest = this.unloadItem(player.cargo, details.item);

        if (manifest.length === 0) {
            console.error(`Could not unload item ${details.item} from ${player.id}`);
            return false;
        }

        const hasCargo = manifest.find(item => item !== 'empty') ? true : false;

        player.cargo = manifest;
        player.hasCargo = hasCargo;
        player.feasibleTrades = hasCargo ? this.pickFeasibleTrades(manifest) : [];

        return true;
    }
    // MARK: PICKUP GOOD
    private processGoodPickup(playerId: PlayerId): boolean {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (
            false === !!player
            || false === !!player.locationActions
            || false === player.isAnchored
            || false === player.locationActions.includes('pickup_good')
            || false === this.hasCargoRoom(player, 'pickup_good')
        ) {
            console.error(`Cannot load goods for ${playerId}`, player);

            return false;
        }

        const locationId = this.sharedState.setup.mapPairings[player.hexagon.hexId].id;
        const nonPickupLocations: Array<LocationId> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationId)) {
            console.error(`Cannot pick up goods from ${locationId}`);
            return false;
        }

        const localGood = serverConstants.LOCATION_GOODS[locationId as PickupLocationId];

        player.cargo = this.loadItem(player.cargo, localGood);
        player.hasCargo = true;
        player.moveActions = 0;
        player.locationActions = this.removeAction(player.locationActions, 'pickup_good');
        player.feasibleTrades = this.pickFeasibleTrades(player.cargo);

        return true;
    }
    // MARK: GOODS TRADE
    private processGoodsTrade(message: WebsocketClientMessage): boolean {
        const player = this.sharedState.players.find(player => player.id === message.playerId);
        const tradeAction = message.action as LocationAction;
        const details = message.details as MarketSaleDetails;
        const marketKey = details.slot;

        if (
            !player?.locationActions?.includes(tradeAction)
            || false === player.feasibleTrades.includes(marketKey)
            || false === player.isAnchored
        ) {
            console.error(`Trade action ${tradeAction} not feasible for ${player?.id}`);

            return false;
        }

        const trade = this.sharedState.marketOffer[marketKey];

        switch (tradeAction) {
            case 'sell_goods':
                const modifier = this.sharedState.setup.marketFluctuations[marketKey];
                player.coins += trade.reward.coins + modifier;
                break;
            case 'donate_goods':
                const reward = trade.reward.favorAndVp;
                player.favor = Math.min(6, player.favor + reward);
                this.privateState.playerVPs.find(p => p.id === player.id)!.vp += reward;
                console.info(this.privateState.playerVPs);
                break;
            default:
                console.error(`Unknown trade action: ${tradeAction}`);
                return false;
        }

        const playerCargo = (() => {
            let playerCargo = this.tools.getCopy(player.cargo);

            for (const goodId of trade.request) {
                playerCargo = this.unloadItem(playerCargo, goodId);
            };

            return playerCargo;
        })();

        if (playerCargo.length === 0) {
            console.error(`Could not match cargo item to trade request: ${playerCargo}`);
            return false;
        }

        player.cargo = playerCargo;
        player.hasCargo = player.cargo.find(item => item !== 'empty') ? true : false;
        player.locationActions = this.removeAction(player.locationActions, tradeAction);
        player.moveActions = 0;

        // Update market offer
        const isNewTrade = ((): boolean => {
            const market = this.sharedState.marketOffer;

            market.deckSize -= 1;
            market.slot_3 = market.slot_2;
            market.slot_2 = market.slot_1;
            market.slot_1 = market.future;

            // Load trade deck B if needed and not already loaded
            const tradeDeck = ((): Array<Trade> => {
                if (this.privateState.tradeDeck.length === 0 && this.sharedState.marketOffer.deckId === 'A') {
                    this.privateState.tradeDeck = this.tools.getCopy(TRADE_DECK_B);
                    this.sharedState.marketOffer.deckId = 'B';

                    console.info('Deck B loaded');
                }

                return this.privateState.tradeDeck;
            })();

            const pick = Math.floor(Math.random() * tradeDeck.length);
            const newTrade = tradeDeck.splice(pick, 1).shift();

            if (!newTrade) {
                return false;
            }

            market.future = newTrade;

            return true;
        })();

        if (!isNewTrade) {
            console.info('Game over!');

            return false;
        }

        const players = this.sharedState.players;

        players.forEach(player => {
            player.feasibleTrades = this.pickFeasibleTrades(player.cargo);
        });

        return true;
    }
    // MARK: METAL PURCHASE
    private processMetalTrade(message: WebsocketClientMessage): boolean {
        const player = this.sharedState.players.find(player => player.id === message.playerId);
        const details = message.details as MetalPurchaseDetails;

        if (
            false === !!player
            || false === !!player.locationActions?.includes('buy_metals')
            || false === player.isAnchored
            || false === this.hasCargoRoom(player, 'buy_metals')
        ) {
            console.error(`Player ${player?.id} cannot buy metals`);
            return false;
        }

        const templeStatus = this.sharedState.templeStatus;
        const metalCost = (() =>{ switch (details.metal) {
            case 'gold': return templeStatus.prices.goldCost;
            case 'silver': return templeStatus.prices.silverCost;
            default: return null;
        }})();
        const playerAmount = (() => { switch (details.currency) {
            case 'coins': return player.coins;
            case 'favor': return player.favor;
            default: return null;
        }})();

        if (!metalCost || !playerAmount) {
            console.error(`No such cost or player amount found: ${metalCost}, ${player}`);
            return false;
        }

        const remainder = playerAmount - metalCost[details.currency];

        if (remainder < 0) {
            console.error(`Player ${player.id} cannot afford metal purchase`);

            return false;
        }

        switch (details.currency) {
            case 'coins':
                player.coins = remainder;
                break;
            case 'favor':
                player.favor = remainder;
                break;
            default:
                console.error(`Unknown currency: ${details.currency}`);
                return false;
        }

        player.cargo = this.loadItem(player.cargo, details.metal);
        player.hasCargo = true;
        player.moveActions = 0;

        return true;
    }
    // MARK: DONATE METALS
    private processMetalDonation(message: WebsocketClientMessage): boolean {
        const player = this.sharedState.players.find(player => player.id === message.playerId);
        const details = message.details as MetalPurchaseDetails;

        if (
            false === !!player
            || false === !!player.locationActions?.includes('donate_metals')
            || false === player.isAnchored
            || false === player.cargo.includes(details.metal)
        ) {
            console.error(`Player ${player?.id} cannot donate ${details.metal}`);
            return false;
        }

        const reward = details.metal === 'gold' ? 10 : 5
        this.privateState.playerVPs.find(p => p.id === player.id)!.vp += reward;
        console.info(this.privateState.playerVPs);

        player.cargo = this.unloadItem(player.cargo, details.metal);
        player.hasCargo = player.cargo.find(item => item !== 'empty') ? true : false;
        player.moveActions = 0;

        const newStatus = this.tools.getCopy(this.sharedState.templeStatus);
        newStatus.levelCompletion += 1;
        newStatus.donations.push(details.metal);

        if (newStatus.levelCompletion === 3) {
            newStatus.currentLevel += 1;
            const newPrices = this.privateState.metalPrices.pop();

            if (!newPrices) {
                console.info('Game over!');

                return false;
            }

            newStatus.prices = newPrices;


            newStatus.levelCompletion = 0;
        }

        this.sharedState.templeStatus = newStatus;

        return true;
    }
    // MARK: END TURN
    private processEndTurn(playerId: PlayerId): boolean {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (player?.isActive && player.isAnchored) {
            this.passActiveStatus();

            return true;
        }

        return false;
    }
    // MARK: UPGRADE HOLD
    private processUpgrade(playerId: PlayerId): boolean {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (
            player?.locationActions?.includes('upgrade_hold')
            && player.coins >= 2
            && player.cargo.length < 4
        ) {
            player.coins -= 2;
            player.cargo.push('empty');
            player.locationActions = this.removeAction(player.locationActions, 'upgrade_hold');
            player.moveActions = 0;

            return true;
        }

        return false;
    }

    // MARK: Helper methods
    private getPortRegistry(destinationHex: HexId): Array<RegistryItem> | false {
        const registry: Array<RegistryItem> = [];
        const players = this.sharedState.players;

        players.forEach(player => {
            if (player.hexagon.hexId === destinationHex) {
                registry.push({ id: player.id, influence: player.influence });
            }
        });

        if (registry.length === 0) {
            return false;
        }

        return registry;
    }

    private processInfluenceRoll(activePlayer: Player, registry: Array<RegistryItem>): boolean {
        let canMove = true;

        activePlayer.influence = Math.ceil(Math.random() * 6) as DiceSix;
        let highestInfluence = activePlayer.influence;

        registry.forEach(item => {
            if (item.influence > highestInfluence) {
                canMove = false;
                highestInfluence = item.influence;
            }
        });

        if (canMove) {
            return true;
        }

        registry.forEach(item => {
            const player = this.sharedState.players.find(player => player.id === item.id);

            if (player?.influence === highestInfluence) {
                player.influence -= 1;
            }
        });

        return false;
    }

    private passActiveStatus(): void {
        const players = this.sharedState.players;
        const activePlayer = players.find(player => player.isActive);

        if (!activePlayer) {
            throw new Error('No active player found');
        }

        activePlayer.isActive = false;
        activePlayer.locationActions = null;
        activePlayer.privilegedSailing = false;

        const nextToken = activePlayer.turnOrder === players.length
            ? 1
            : activePlayer.turnOrder + 1;

        const nextActivePlayer = players.find(player => player.turnOrder === nextToken);

        if (nextActivePlayer) {
            nextActivePlayer.isActive = true;
            this.setTurnStartCondition(nextActivePlayer);
        }
    }

    private setTurnStartCondition(player: Player): void {

        player.isAnchored = false;
        player.privilegedSailing = false;
        player.moveActions = 2;
        player.locationActions = this.getLocationActions(player);

        const rules = this.privateState.moveRules.find(
            rule => rule.from === player.hexagon.hexId
        ) as ProcessedMoveRule;

        player.allowedMoves = rules.allowed as Array<HexId>;
    }

    private removeAction(actions: Array<LocationAction>, toRemove: LocationAction): Array<LocationAction> | null {
        const index = actions.indexOf(toRemove);

        if (index === -1) {
            return null;
        }

        actions.splice(index, 1);

        if (actions.length === 0) {
            return null;
        }

        return actions;
    }

    private getLocationActions(player: Player, hexId: HexId | null = null): Array<LocationAction> | null {
        const location = this.tools.getCopy((
            this.sharedState.setup.mapPairings[hexId || player.hexagon.hexId]
        ));

        return location.actions;
    }

    private hasCargoRoom(player: Player, action: LocationAction): boolean {
        if (action !== 'buy_metals' && action !== 'pickup_good') {
            console.error(`Incompatible settlement action: ${action}`);

            return false;
        }

        const cargo = player.cargo;
        const emptySlots = cargo.filter(item => item === 'empty').length;
        const cargoReq = action === 'pickup_good' ? 1 : 2;

        return emptySlots >= cargoReq;
    }

    private pickFeasibleTrades(playerCargo: CargoManifest) {
        const market = this.tools.getCopy(this.sharedState.marketOffer);
        const cargo = this.tools.getCopy(playerCargo);
        const nonGoods: Array<ItemId> = ['empty', 'gold', 'silver', 'gold_extra', 'silver_extra'];

        const slots: Array<MarketKey> = ['slot_1', 'slot_2', 'slot_3'];
        const feasable: Array<MarketKey> = [];

        slots.forEach(key => {
            const unfilledGoods = market[key].request;

            for (let i = 0; i < cargo.length; i++) {

                if (nonGoods.includes(cargo[i])) {
                    continue;
                }

                const carriedGood = cargo[i] as GoodId;
                const match = unfilledGoods.indexOf(carriedGood);

                if (match !== -1) {
                    unfilledGoods.splice(match, 1);
                }
            }

            if (unfilledGoods.length === 0) {
                feasable.push(key);
            }
        });

        return feasable;
    }

    private loadItem(cargo: CargoManifest, item: ItemId): CargoManifest {
        const filled = cargo.filter(item => item !== 'empty') as Array<ItemId>;
        const empty = cargo.filter(item => item === 'empty') as Array<ItemId>;
        const orderedCargo = filled.concat(empty);

        const firstEmpty = orderedCargo.indexOf('empty');
        orderedCargo[firstEmpty] = item;

        if (item === 'gold' || item === 'silver') {
            orderedCargo[firstEmpty + 1] = item + '_extra' as ItemId;
        }

        return orderedCargo;
    }

    private unloadItem(cargo: CargoManifest, item: ItemId): CargoManifest {
        const manifest = this.tools.getCopy(cargo);
        const manifestIndex = manifest.indexOf(item);

        if (manifestIndex === -1) {
            return [];
        }
        manifest.splice(manifestIndex, 1, 'empty');

        if (['gold', 'silver'].includes(item)) {
            manifest.splice(manifestIndex + 1, 1, 'empty');
        }

        return manifest;
    }
}