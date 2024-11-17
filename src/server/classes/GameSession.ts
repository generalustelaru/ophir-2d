import { PrivateState, ProcessedMoveRule, StateBundle, WssMessage } from "../server_types";
import { HexId, PlayerId, Player, SharedState, WebsocketClientMessage, GoodId, SettlementAction, MovementDetails, DropItemDetails, DiceSix, RepositioningDetails, CargoManifest, MarketKey, ManifestItem, ContractFulfillmentDetails, SettlementId } from "../../shared_types";

type RegistryItem = { id: PlayerId, influence: DiceSix };

export class GameSession {

    private privateState: PrivateState;
    private sharedState: SharedState;

    constructor(bundle: StateBundle) {
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;

        this.setTurnStartConditions(this.findActivePlayer());
    }

    public processAction(message: WebsocketClientMessage): WssMessage {
        const id = message.playerId;

        if (!id) {
            return { error: 'No player ID provided' };
        }

        switch (message.action) {
            case 'favor':
                return this.processFavorSpending(id) ? this.sharedState : { error: `Illegal favor spend on ${id}` };
            case 'move':
                return this.processMove(message) ? this.sharedState : { error: `Illegal move on ${id}` };
            case 'reposition':
                return this.processRepositioning(message) ? this.sharedState : { error: `Illegal repositioning on ${id}` };
            case 'pickup_good':
                return this.processGoodPickup(id) ? this.sharedState : { error: `Illegal pickup on ${id}` };
            case 'sell_goods':
                return this.processContractSale(message) ? this.sharedState : { error: `Illegal contract sale on ${id}` };
            case 'turn':
                return this.processEndTurn(id) ? this.sharedState : { error: `Illegal turn end on ${id}` };
            case 'drop_item':
                return this.processItemDrop(message) ? this.sharedState : { error: `Illegal drop on ${id}` };
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
            player.allowedMoves = this.privateState.moveRules
                .find(rule => rule.from === destination)?.allowed
                .filter(move => move !== departure) as Array<HexId>;
            player.isAnchored = true;
            player.allowedSettlementAction = this.getAllowedSettlementActionFromLocation(player, destination);
        }

        if (player.moveActions === 0 && !sailSuccess) {
            player.isAnchored = true;
            player.allowedSettlementAction = null;
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

        if (player && player.favor > 0 && player.hasSpentFavor === false) {
            player.favor -= 1;
            player.hasSpentFavor = true;
            player.isAnchored = true;
            player.allowedSettlementAction = this.getAllowedSettlementActionFromLocation(player);

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

        const canPickupGood = this.canItemBeLoaded(player, 'pickup_good');
        const localGood = this.getMatchingGood(player.location.hexId);

        if (!player.allowedSettlementAction || !localGood || !canPickupGood) {
            return false;
        }

        for (let i = 0; i < player.cargo.length; i++) {
            const item = player.cargo[i];

            if (item === 'empty') {
                player.cargo[i] = localGood;
                player.allowedSettlementAction = null;
                player.moveActions = 0;
                player.hasCargo = true;
                player.feasibleContracts = this.getFeasableContracts(player.cargo);

                return true;
            }
        }

        return false;
    }

    private processContractSale(message: WebsocketClientMessage): boolean {
        const player = this.sharedState.players.find(player => player.id === message.playerId);
        const details = message.details as ContractFulfillmentDetails;
        const marketKey = details.contract;

        if (!player?.feasibleContracts.includes(marketKey) || !player.allowedSettlementAction) {
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
        player.allowedSettlementAction = null;

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
        const playerCount = players.length;

        const activePlayer = players.find(player => player.isActive);

        if (!activePlayer) {
            throw new Error('No active player found');
        }

        activePlayer.isActive = false;

        const nextToken = activePlayer.turnOrder === playerCount
            ? 1
            : activePlayer.turnOrder + 1;

        for (let i = 0; i < players.length; i++) {
            const player = players[i];

            if (player.turnOrder === nextToken) {
                player.isActive = true;
                this.setTurnStartConditions(player.id);
                break;
            }
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

    private setTurnStartConditions(playerId: PlayerId): void {
        const player = this.sharedState.players.find(player => player.id === playerId);

        if (!player) {
            throw new Error('No player found');
        }

        player.isAnchored = false;
        player.hasSpentFavor = false;
        player.moveActions = 2;
        player.allowedSettlementAction = null;

        const rules = this.privateState.moveRules.find(
            rule => rule.from === player.location.hexId
        ) as ProcessedMoveRule;

        player.allowedMoves = rules.allowed as Array<HexId>;
    }

    private getMatchingGood(hexId: HexId): GoodId | false {
        const settlement = this.sharedState.setup.settlements[hexId];

        switch (settlement) {
            case 'farms': return 'cloth';
            case 'mines': return 'gem';
            case 'forest': return 'wood';
            case 'quary': return 'stone';
            default: return false;
        }
    }

    private getAllowedSettlementActionFromLocation(playerState: Player, hexId: HexId | null = null): SettlementAction | null {
        const settlementId = this.sharedState.setup.settlements[hexId || playerState.location.hexId];
        const pickupSettlement: Array<SettlementId> = ['farms', 'mines', 'forest', 'quary'];

        switch (true) {
            case pickupSettlement.includes(settlementId): return 'pickup_good';
            case 'market' == settlementId: return 'sell_goods';
            case 'exchange' == settlementId: return 'buy_metals';
            case 'temple' == settlementId: return 'visit_temple';
            default:
                console.error(`Unknown settlement at ${hexId}`);
                return null;
        }
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