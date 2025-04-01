import process from 'process';
import { DataDigest, StateBundle } from "./server_types";
import {
    GameState, ClientRequest, GameStateResponse,
    ChatEntry, ServerMessage, Action,
} from "./../shared_types";
import { validator } from "./services/validation/ValidatorService";
import { GameStateHandler } from "./object_handlers/GameStateHandler";
import { PlayerHandler } from './object_handlers/PlayerHandler';
import { IDLE_CHECKS } from "./configuration";
// import { PrivateStateHandler } from '../data_classes/PrivateState';
import lib from './action_processors/library'
import { PlayProcessor } from './action_processors/PlayProcessor';

const serverName = String(process.env.SERVER_NAME);

export class GameSession {

    // private privateState: PrivateStateHandler;
    private state: GameStateHandler;
    private play: PlayProcessor;
    private idleCheckInterval: NodeJS.Timeout | null = null;

    constructor(bundle: StateBundle) {
        (global as any).myInstance = this;
        // this.privateState = bundle.privateState;
        this.state = bundle.gameState;
        this.play = new PlayProcessor(bundle);
        const activePlayer = this.state.getActivePlayer();

        if (!activePlayer) {
            throw new Error('No active player found');
        }

        console.info('Game session created');

        if(IDLE_CHECKS)
            this.startIdleChecks();
    }

    public getState(): GameState {
        return this.state.toDto();
    }

    public getSessionOwner() {
        return this.state.getSessionOwner();
    }

    public wipeSession(): null {
        this.idleCheckInterval && clearInterval(this.idleCheckInterval);
        delete (global as any).myInstance;

        return null;
    }

    // MARK: ACTION SWITCH
    public processAction(request: ClientRequest): ServerMessage {
        const { playerColor, message } = request;
        const { action, payload } = message;

        if (action === Action.get_status) {
            return this.processStatusRequest();
        }

        if (!playerColor)
            return lib.issueErrorResponse('No player ID provided');

        const playerObject = this.state.getPlayer(playerColor);

        if (!playerObject)
            return lib.issueErrorResponse(`Player does not exist: ${playerColor}`);

        const player = new PlayerHandler(playerObject);
        player.refreshTimeStamp();

        const digest: DataDigest = { player, payload }

        if (action == Action.chat)
            return this.processChat(digest);

        if (!player.isActivePlayer())
            return lib.issueErrorResponse(`It is not [${player.getIdentity().name}]'s turn!`);

        const actionsWhileFrozen: Array<Action> = [
            Action.drop_item,
            Action.reposition,
            Action.reposition_rival,
            Action.move_rival,
            Action.end_rival_turn,
            Action.shift_market,
        ];

        if (player.isFrozen() && !actionsWhileFrozen.includes(action))
            return lib.issueErrorResponse(`[${player.getIdentity().name}] is handling rival and cannot act.`)

        switch (action) {
            case Action.spend_favor:
                return this.play.processFavorSpending(digest);
            case Action.move:
                return this.play.processMove(digest);
            case Action.move_rival:
                return this.play.processMove(digest, true);
            case Action.reposition:
                return this.play.processRepositioning(digest);
                case Action.reposition_rival:
                return this.play.processRepositioning(digest, true);
            case Action.load_good:
                return this.play.processLoadGood(digest);
            case Action.make_trade:
                return this.play.processGoodsTrade(digest);
            case Action.buy_metals:
                return this.play.processMetalPurchase(digest);
            case Action.donate_metals:
                return this.play.processMetalDonation(digest);
            case Action.end_turn:
                return this.play.processEndTurn(digest);
            case Action.end_rival_turn:
                return this.play.processRivalTurn(digest);
            case Action.shift_market:
                return this.play.processRivalTurn(digest, true);
            case Action.upgrade_cargo:
                return this.play.processUpgrade(digest);
            case Action.drop_item:
                return this.play.processItemDrop(digest);
            default:
                return lib.issueErrorResponse(`Unknown action: ${action}`);
        }
    }

    private processStatusRequest(): GameStateResponse {
        const stateDto = this.state.toDto()
        stateDto.isStatusResponse = true;

        return { game: stateDto };
    }

    // MARK: CHAT
    private processChat(data: DataDigest) {
        const { player , payload } = data;
        const chatPayload = validator.validateChatPayload(payload);

        if (!chatPayload)
            return lib.validationErrorResponse();

        const { id, name } = player.getIdentity();
        this.state.addChatEntry({
            id,
            name,
            message: chatPayload.input,
        });

        return this.issueStateResponse(player);
    }

    // MARK: startIdleChecks
    private startIdleChecks(): void {
        this.idleCheckInterval = setInterval(() => {
            const activePlayer = this.state.getActivePlayer();

            if (!activePlayer) {
                lib.issueErrorResponse('No active player found in idle check!')
                return;
            }

            const timeNow = Date.now();

            if (timeNow - activePlayer.timeStamp > 60000 && !activePlayer.isIdle) {
                activePlayer.isIdle = true;
                this.state.savePlayer(activePlayer);
                this.addServerMessage(`${activePlayer.name} is idle`);
                // this.processEndTurn(activePlayer.id);
            }

        }, 60000);
    }

    // MARK: addServerMessage
    private addServerMessage(message: string): void {
        const chatEntry: ChatEntry = { id: null, name: serverName, message };
        this.state.addChatEntry(chatEntry);
    }

    // MARK: RETURN WRAPPERS

    private issueStateResponse(player: PlayerHandler): GameStateResponse {
        this.state.savePlayer(player.toDto());

        return { game: this.state.toDto() };
    }
}
