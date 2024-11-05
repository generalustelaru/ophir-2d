import { PrivateState, ProcessedMoveRule, StateBundle, WssMessage } from "../server_types";
import { HexId, PlayerId, PlayerState, SharedState, WebsocketClientMessage, GoodId, SettlementAction, MetalId, MoveActionDetails, DropItemActionDetails } from "../../shared_types";
import sharedConstants from "../../shared_constants";
import state from "../../client/state";

const { ACTION } = sharedConstants;

type RegistryItem = { id: PlayerId, influence: number };
export interface GameSessionInterface {
    processAction: (action: any) => WssMessage;
}
export class GameSession implements GameSessionInterface {

    private privateState: PrivateState;
    private sharedState: SharedState;

    constructor(bundle: StateBundle) {
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;

        this.setTurnStartConditions(this.findActivePlayer());
    }

    public processAction(message: WebsocketClientMessage): WssMessage {
        const id = message.playerId;
        switch (message.action) {
            case ACTION.favor:
                return this.processFavorSpending(id) ? this.sharedState : { error: `Illegal favor spend on ${id}` };
            case ACTION.move:
                return this.processMove(message) ? this.sharedState : { error: `Illegal move on ${id}` };
            case ACTION.pickup_good:
                return this.processGoodPickup(id) ? this.sharedState : { error: `Illegal pickup on ${id}` };
            case ACTION.turn:
                return this.processEndTurn(id) ? this.sharedState : { error: `Illegal turn end on ${id}` };
            case ACTION.drop_item:
                return this.processItemDrop(message) ? this.sharedState : { error: `Illegal drop on ${id}` };
            default:
                return { error: `Unknown action on ${id}` };
        }
    }

    // Player action processing methods
    private processMove(message: WebsocketClientMessage): boolean {
        const details = message.details as MoveActionDetails;

        const player = this.sharedState.players[message.playerId] as PlayerState;
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
                .filter(move => move !== departure) as HexId[];
            player.isAnchored = true;
            player.allowedSettlementAction = this.getAllowedSettlementActionFromLocation(player, destination);
        }

        if (player.moveActions === 0 && !sailSuccess) {
            this.passActiveStatus();
        }

        return true;
    }

    private processFavorSpending(playerId: PlayerId): boolean {
        const player = this.sharedState.players[playerId];

        if (player.favor > 0 && player.hasSpentFavor === false) {
            player.favor -= 1;
            player.hasSpentFavor = true;
            player.isAnchored = true;
            player.allowedSettlementAction = this.getAllowedSettlementActionFromLocation(player);

            return true;
        }

        return false;
    }

    private processItemDrop(message: WebsocketClientMessage): boolean {
        const details = message.details as DropItemActionDetails

        const player = this.sharedState.players[message.playerId];
        const manifest = player.cargo;

        if (!manifest.includes(details.item)) {
            return false;
        }

        manifest.splice(manifest.indexOf(details.item), 1, 'empty');

        let hasCargo = false;
        manifest.forEach(item => {
            if (item !== 'empty') {
                hasCargo = true;
            }
        });
        player.hasCargo = hasCargo;

        return true;
    }

    private processGoodPickup(playerId: PlayerId): boolean {
        const player = this.sharedState.players[playerId];
        const localGood = this.getMatchingGood(player.location.hexId);

        if (!player.allowedSettlementAction || !localGood) {
            return false;
        }

        for (let i = 0; i < player.cargo.length; i++) {
            const item = player.cargo[i];

            if (item === 'empty') {
                player.cargo[i] = localGood;
                player.allowedSettlementAction = null;
                player.moveActions = 0;
                player.hasCargo = true;

                return true;
            }
        }

        return false;
    }

    private processEndTurn(playerId: PlayerId): boolean {
        const player = this.sharedState.players[playerId];

        if (player.isActive && player.isAnchored) {
            this.passActiveStatus();

            return true;
        }

        return false;
    }

    // Helper methods
    private getPortRegistry(destinationHex: HexId): RegistryItem[] | false {
        const registry: RegistryItem[] = [];
        const players = this.sharedState.players;

        for (const id in players) {
            const playerId = id as PlayerId;
            const player = players[playerId];

            if (player.location.hexId === destinationHex) {
                registry.push({ id: playerId, influence: player.influence });
            }
        }

        if (registry.length === 0) {
            return false;
        }

        return registry;
    }

    private processInfluenceRoll(activePlayer: PlayerState, registry: RegistryItem[]): boolean {
        let canMove = true;

        activePlayer.influence = Math.ceil(Math.random() * 6);
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

        for (const id in this.sharedState.players) {
            const playerId = id as PlayerId;
            const player = this.sharedState.players[playerId];

            if (player.influence === highestInfluence) {
                player.influence -= 1;
            }
        }

        return false;
    }

    private passActiveStatus(): void {
        const players = this.sharedState.players;
        const playerCount = Object.keys(players).length;

        const activePlayer = players[this.findActivePlayer()];
        activePlayer.isActive = false;

        const nextToken = activePlayer.turnOrder === playerCount
            ? 1
            : activePlayer.turnOrder + 1;

        for (const id in players) {
            const playerId = id as PlayerId;
            const player: PlayerState = players[playerId];

            if (player.turnOrder === nextToken) {
                player.isActive = true;
                this.setTurnStartConditions(playerId);
                break;
            }
        }
    }

    private findActivePlayer(): PlayerId {
        const players = this.sharedState.players;

        for (const id in players) {
            const playerId = id as PlayerId;

            if (players[playerId].isActive) {
                return playerId;
            }
        }

        throw new Error('No active player found');
    }

    private setTurnStartConditions(playerId: PlayerId): void {
        const player = this.sharedState.players[playerId];

        player.isAnchored = false;
        player.hasSpentFavor = false;
        player.moveActions = 2;
        player.allowedSettlementAction = null;

        const rules = this.privateState.moveRules.find(
            rule => rule.from === player.location.hexId
        ) as ProcessedMoveRule;

        player.allowedMoves = rules.allowed as HexId[];
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

    private getAllowedSettlementActionFromLocation(
        playerState: PlayerState,
        hexId: HexId | null = null
    ): SettlementAction | null {
        const settlementId = this.sharedState.setup.settlements[hexId || playerState.location.hexId];

        switch (settlementId) {
            case 'farms':
            case 'mines':
            case 'forest':
            case 'quary': return this.loadActionByCargoReq(playerState, 'pickup_good');
            case 'market': return 'sell_goods';
            case 'exchange': return this.loadActionByCargoReq(playerState, 'buy_metals');
            case 'temple': return 'visit_temple';
            default:
                console.error(`Unknown settlement at ${hexId}`);
                return null;
        }
    }

    private loadActionByCargoReq(player: PlayerState, desired: SettlementAction): SettlementAction|null
    {
        if (desired !== 'buy_metals' && desired !== 'pickup_good') {
            console.error(`Incompatible settlement action: ${desired}`);

            return null;
        }

        const cargo = player.cargo;
        const emptySlots = cargo.filter(item => item === 'empty').length;
        const cargoReq = desired === 'pickup_good' ? 1 : 2;

        return emptySlots >= cargoReq ? desired : null;
    }
}