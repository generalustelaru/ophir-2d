import { PrivateState, ProcessedMoveRule, StateBundle, WssMessage } from "../server_types";
import { HexId, PlayerId, Player, SharedState, WebsocketClientMessage, GoodId, SettlementAction, MovementDetails, DropItemDetails, DiceSix, RepositioningDetails, CargoManifest, MarketKey, ManifestItem, MarketSaleDetails } from "../../shared_types";
import serverConstants from "../server_constants";

type RegistryItem = { id: PlayerId, influence: DiceSix };

export class GameSession {

    private privateState: PrivateState;
    private sharedState: SharedState;

    constructor(bundle: StateBundle) {
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;

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

        const departure = player.location.hexId;
        const destination = details.hexId;
        const remainingMoves = player.moveActions;
        const hexMoveRule = this.privateState.moveRules.find(rule => rule.from === departure) as ProcessedMoveRule;

        if (!hexMoveRule.allowed.includes(destination) || remainingMoves === 0) {
            return false;
        }

        player.moveActions = remainingMoves - 1;

        const registry = this.getPortRegistry(destination);
        const sailSuccess = !registry || player.hasSpentFavor
            ? true
            : this.processInfluenceRoll(player, registry);

        if (sailSuccess) {
            player.location = { hexId: destination, position: details.position };
            player.allowedMoves = (
                this.privateState.moveRules
                .find(rule => rule.from === destination)?.allowed
                .filter(move => move !== departure) as Array<HexId>
            );
            player.isAnchored = true;
            player.locationActions = this.getlocationActionsFromLocation(player, destination);
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
            return false;
        }

        player.location.position = details.repositioning;

        return true;
    }

    private processFavorSpending(playerId: PlayerId): boolean {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (player?.isActive && player.favor > 0 && player.hasSpentFavor === false) {
            player.favor -= 1;
            player.hasSpentFavor = true;
            player.isAnchored = true;
            player.locationActions = this.getlocationActionsFromLocation(player);

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

        player.feasibleContracts = hasCargo ? this.getFeasableContracts(manifest) : [];
        player.hasCargo = hasCargo;

        return true;
    }

    private processGoodPickup(playerId: PlayerId): boolean {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (!player) {
            return false;
        }

        const localGood = this.getMatchingGood(player.location.hexId);
        const actions = player.locationActions;

        if (
            !actions
            || !localGood
            || !actions.includes('pickup_good')
            || !this.canItemBeLoaded(player, 'pickup_good')
        ) {
            return false;
        }

        for (let i = 0; i < player.cargo.length; i++) {
            const item = player.cargo[i];

            if (item === 'empty') {
                player.hasCargo = true;
                player.cargo[i] = localGood;
                player.feasibleContracts = this.getFeasableContracts(player.cargo);
                player.moveActions = 0;
                player.locationActions = this.removeAction(actions, 'pickup_good');

                return true;
            }
        }

        return false;
    }

    private processGoodsSale(message: WebsocketClientMessage): boolean {
        const player = this.sharedState.players.find(player => player.id === message.playerId);
        const details = message.details as MarketSaleDetails;
        const marketKey = details.slot;

        if (
            !player?.locationActions?.includes('sell_goods')
            || !player.feasibleContracts.includes(marketKey)
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
            player.feasibleContracts = this.getFeasableContracts(player.cargo);
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
            if (player.location.hexId === destinationHex) {
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
        activePlayer.hasSpentFavor = false;

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
        player.hasSpentFavor = false;
        player.moveActions = 2;
        player.locationActions = null;

        const rules = this.privateState.moveRules.find(
            rule => rule.from === player.location.hexId
        ) as ProcessedMoveRule;

        player.allowedMoves = rules.allowed as Array<HexId>;
    }

    private removeAction(actions: Array<SettlementAction>, toRemove: SettlementAction): Array<SettlementAction> | null {
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

    private getMatchingGood(hexId: HexId): GoodId | false {
        const settlement = this.sharedState.setup.locationPairings[hexId].id;

        switch (settlement) { // TODO: convert this into a constant as well
            case 'farms': return 'cloth';
            case 'mines': return 'gem';
            case 'forest': return 'wood';
            case 'quary': return 'stone';
            default: return false;
        }
    }

    private getlocationActionsFromLocation(playerState: Player, hexId: HexId | null = null): Array<SettlementAction> | null {
        const settlementId = this.sharedState.setup.locationPairings[hexId || playerState.location.hexId];
        const defaultActions = serverConstants.SETTLEMENT_ACTIONS[settlementId.id].actions;

        return defaultActions;

        // TODO: as this method has lost its purpose, it should be modified into a filter for actions
        // const pickupSettlement: Array<SettlementId> = ['farms', 'mines', 'forest', 'quary'];

        // switch (true) {
        //     case pickupSettlement.includes(settlementId): return ['pickup_good'];
        //     case 'market' == settlementId: return ['sell_goods'];
        //     case 'exchange' == settlementId: return ['buy_metals'];
        //     case 'temple' == settlementId: return ['upgrade_hold', 'donate_goods'];
        //     default:
        //         console.error(`Unknown settlement at ${hexId}`);
        //         return null;
        // }
    }

    private canItemBeLoaded(player: Player, desired: SettlementAction): boolean {
        if (desired !== 'buy_metals' && desired !== 'pickup_good') {
            console.error(`Incompatible settlement action: ${desired}`);

            return false;
        }

        const cargo = player.cargo;
        const emptySlots = cargo.filter(item => item === 'empty').length;
        const cargoReq = desired === 'pickup_good' ? 1 : 2;

        return emptySlots >= cargoReq;
    }

    private getFeasableContracts(cargo: CargoManifest) {
        const contracts = this.sharedState.market;
        const feasable: Array<MarketKey> = [];
        const nonGoods: Array<ManifestItem> = ['empty', 'gold_a', 'gold_b', 'silver_a', 'silver_b'];
        const slots: Array<MarketKey> = ['slot_1', 'slot_2', 'slot_3'];

        slots.forEach(key => {
            const request = [...contracts[key].request];

            for (let i = 0; i < cargo.length; i++) {

                if (nonGoods.includes(cargo[i])) {
                    continue;
                }

                const carriedGood = cargo[i] as GoodId;
                const match = request.indexOf(carriedGood);

                if (match !== -1) {
                    request.splice(match, 1);
                }
            }

            if (request.length === 0) {
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