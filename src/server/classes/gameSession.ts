import { PrivateState, StateBundle, WssMessage } from "../server_types";
import { HexId, MoveActionDetails, PlayerId, PlayerState, PlayerStates, SharedState, WebsocketClientMessage } from "../../shared_types";
import { ToolService, ToolInterface } from "../services/toolService";
import sharedConstants from "../../shared_constants";

const { ACTION } = sharedConstants;

type ManifestItem = { id: PlayerId, influence: number };
export interface GameSessionInterface {
    processAction: (action: any) => WssMessage;
}
export class GameSession implements GameSessionInterface {

    private privateState: PrivateState;
    private sharedState: SharedState;
    private tools: ToolInterface;

    constructor(bundle: StateBundle) {
        this.tools = ToolService.getInstance();
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;

        this.setTurnStartConditions(this.findActivePlayer());
    }

    public processAction = (message: WebsocketClientMessage): WssMessage => {
        const id = message.playerId;
        switch (message.action) {
            case ACTION.move:
                return this.processMove(message) ? this.sharedState : { error: `Illegal move on ${id}` };
            case ACTION.favor:
                return this.processFavorSpending(id) ? this.sharedState : { error: `Illegal favor spend on ${id}` };
            case ACTION.turn:
                return this.processEndTurn(id) ? this.sharedState : { error: `Illegal turn end on ${id}` };
            default:
                return { error: `Unknown action on ${id}` };
        }
    }

    // Player action processing methods
    private processMove(message: WebsocketClientMessage): boolean {

        const player = this.sharedState.players[message.playerId];
        const departure = player.location.hexId;
        const destination = message.details.hexId;
        const remainingMoves = player.moveActions;
        const allowed = this.privateState.moveRules.find(rule => rule.from === departure).allowed;

        if (allowed.includes(destination) && remainingMoves > 0) {
            player.moveActions = remainingMoves - 1;

            const manifest = this.getPortManifest(destination);
            const sailSuccess = !manifest || player.hasSpentFavor
                ? true
                : this.processInfluenceRoll(player, manifest);

            if (sailSuccess) {
                player.location = { hexId: destination, position: message.details.position };
                player.allowedMoves = this.privateState.moveRules
                    .find(rule => rule.from === destination).allowed
                    .filter(move => move !== departure);
                player.isAnchored = true;
            }

            if (player.moveActions === 0 && !sailSuccess) {
                this.passActiveStatus();
            }

            return true;
        }

        return false;
    }

    private processFavorSpending(playerId: PlayerId): boolean {
        const player = this.sharedState.players[playerId];

        if (player.favor > 0 && player.hasSpentFavor === false) {
            player.favor -= 1;
            player.hasSpentFavor = true;
            player.isAnchored = true;

            return true;
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
    private getPortManifest(destinationHex: HexId): ManifestItem[] | false {
        const manifest: ManifestItem[] = [];
        const players = this.sharedState.players;

        for (const id in players) {
            const playerId = id as PlayerId;
            const player = players[playerId];

            if (player.location.hexId === destinationHex) {
                manifest.push({ id: playerId, influence: player.influence });
            }
        }

        if (manifest.length === 0) {
            return false;
        }

        return manifest;
    }

    private processInfluenceRoll(activePlayer: PlayerState, manifest: ManifestItem[]): boolean {
        let canMove = true;

        activePlayer.influence = Math.ceil(Math.random() * 6);
        let highestInfluence = activePlayer.influence;

        manifest.forEach(item => {
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

    private passActiveStatus = (): void => {
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

    private findActivePlayer = (): PlayerId => {
        const players = this.tools.cc(this.sharedState.players);

        for (const id in players) {
            const playerId = id as PlayerId;

            if (players[playerId].isActive) {
                return playerId;
            }
        }
    }

    private setTurnStartConditions(playerId: PlayerId): void {
        const player = this.sharedState.players[playerId];

        player.isAnchored = false;
        player.hasSpentFavor = false;
        player.moveActions = 2;
        player.allowedMoves = this.privateState.moveRules
            .find(rule => rule.from === player.location.hexId)
            .allowed;
    }
}