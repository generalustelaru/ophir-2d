import { PrivateState, ProcessedMoveRule, StateBundle, WssMessage } from "../server_types";
import { HexId, PlayerId, Player, SharedState, WebsocketClientMessage, GoodId, LocationAction, MovementDetails, DropItemDetails, DiceSix, RepositioningDetails, CargoManifest, MarketKey, ManifestItem, MarketSaleDetails } from "../../shared_types";
import { ToolService } from '../services/ToolService';
type RegistryItem = { id: PlayerId, influence: DiceSix };

export class GameSession {

    private privateState: PrivateState;
    private sharedState: SharedState;
    private tools: ToolService;

    constructor(bundle: StateBundle) {
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;
        this.tools = ToolService.getInstance();

        this.setTurnStartCondition(this.findActivePlayer());
    }

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
                return this.processGoodsSale(message) ? this.sharedState : { error: `Could not process contract sale on ${id}` };
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

    // Player action processing methods
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

    processRepositioning(message: WebsocketClientMessage): boolean {
        const details = message.details as RepositioningDetails;
        const player = this.sharedState.players.find(player => player.id === message.playerId);

        if (!player) {
            console.error(`No such player found: ${message.playerId}`);
            return false;
        }

        player.hexagon.position = details.repositioning;

        return true;
    }

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

    private processItemDrop(message: WebsocketClientMessage): boolean {
        const details = message.details as DropItemDetails

        const player = this.sharedState.players.find(player => player.id === message.playerId);
        const manifest = player?.cargo;

        if (!manifest || !manifest.includes(details.item)) {
            return false;
        }

        manifest.splice(manifest.indexOf(details.item), 1, 'empty');

        const hasCargo = manifest.find(item => item !== 'empty') ? true : false;

        player.feasibleTrades = hasCargo ? this.pickFeasibleTrades(manifest) : [];
        player.hasCargo = hasCargo;

        return true;
    }

    private processGoodPickup(playerId: PlayerId): boolean {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (!player) {
            console.error(`No such player found: ${playerId}`);
            return false;
        }

        if (!player.locationActions) {
            console.error(`No actions found for ${playerId}`);
            return false;
        }

        if (!player.locationActions.includes('pickup_good')) {
            console.error(`'pickup_good' not found for ${playerId}`);
            return false;
        }

        if (!this.hasCargoRoom(player, 'pickup_good')) {
            console.error(`Cannot load goods for ${playerId}`);
            return false;
        }

        const localGood = this.getMatchingGood(player.hexagon.hexId);

        for (let i = 0; i < player.cargo.length; i++) {
            const item = player.cargo[i];

            if (item === 'empty') {
                player.cargo[i] = localGood;
                break;
            }
        }

        player.hasCargo = true;
        player.moveActions = 0;
        player.locationActions = this.removeAction(player.locationActions, 'pickup_good');
        player.feasibleTrades = this.pickFeasibleTrades(player.cargo);

        return true;
    }

    private processGoodsSale(message: WebsocketClientMessage): boolean {
        const player = this.sharedState.players.find(player => player.id === message.playerId);
        const details = message.details as MarketSaleDetails;
        const marketKey = details.slot;

        if (
            !player?.locationActions?.includes('sell_goods')
            || !player.feasibleTrades.includes(marketKey)
        ) {
            return false;
        }

        const contract = this.sharedState.market[marketKey];
        const modifier = this.sharedState.setup.marketFluctuations[marketKey];
        player.coins += contract.reward.coins + modifier;

        const soldGoods = contract.request;
        const playerCargo = player.cargo;

        for (let i = 0; i < soldGoods.length; i++) {
            const goodToUnload = soldGoods[i];
            const cargoSlot = playerCargo.indexOf(goodToUnload);

            if (cargoSlot === -1) {
                return false;
            }

            playerCargo[cargoSlot] = 'empty';
        }

        player.hasCargo = playerCargo.find(item => item !== 'empty') ? true : false;
        player.locationActions = this.removeAction(player.locationActions, 'sell_goods');
        player.moveActions = 0;

        const isNewContract = this.shiftMarket();

        if (!isNewContract) {
            return false;
        }

        const players = this.sharedState.players;

        players.forEach(player => {
            player.feasibleTrades = this.pickFeasibleTrades(player.cargo);
        });

        return true;
    }

    private processEndTurn(playerId: PlayerId): boolean {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (player?.isActive && player.isAnchored) {
            this.passActiveStatus();

            return true;
        }

        return false;
    }

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

    // Helper methods
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
            this.setTurnStartCondition(nextActivePlayer.id);
        }
    }

    private findActivePlayer(): PlayerId {
        const players = this.sharedState.players;

        for (let i = 0; i < players.length; i++) {
            const player = players[i];

            if (player.isActive) {
                return player.id;
            }
        }

        throw new Error('No active player found');
    }

    private setTurnStartCondition(playerId: PlayerId): void {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (!player) {
            throw new Error('No player found');
        }

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

    private getMatchingGood(hexId: HexId): GoodId | 'empty' {
        const locationId = this.sharedState.setup.mapPairings[hexId].id;

        switch (locationId) { // TODO: convert this into a constant as well
            case 'farms': return 'cloth';
            case 'mines': return 'gem';
            case 'forest': return 'wood';
            case 'quary': return 'stone';
            default: {
                console.error(`No goods found at ${hexId}`);
                return 'empty'
            };
        }
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
        const market = this.tools.getCopy(this.sharedState.market);
        const cargo = this.tools.getCopy(playerCargo);
        const nonGoods: Array<ManifestItem> = ['empty', 'gold_a', 'gold_b', 'silver_a', 'silver_b'];

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

    private shiftMarket(): boolean {
        const market = this.sharedState.market;

        market.slot_3 = market.slot_2;
        market.slot_2 = market.slot_1;
        market.slot_1 = market.future;

        const contractDeck = this.privateState.marketContracts;
        const pick = Math.floor(Math.random() * contractDeck.length);
        const newContract = contractDeck.splice(pick, 1).shift();

        if (!newContract) {
            console.error('No contract drawn');

            return false;
        }

        market.future = newContract;

        return true;
    }
}