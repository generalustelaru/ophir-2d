import {WsDigest, DataDigest } from "./server_types";
import { randomUUID } from 'crypto';
import {
    ClientRequest, ServerMessage, Action, EnrolmentState, ResetResponse, PlayState, GameStateResponse, ErrorResponse,
    GameState,
} from "./../shared_types";
import { PlayerHandler } from './state_handlers/PlayerHandler';
import lib from './action_processors/library'
import { PlayProcessor } from './action_processors/PlayProcessor';
import { SetupProcessor } from './action_processors/SetupProcessor';
import { EnrolmentProcessor } from './action_processors/EnrolmentProcessor';
import serverConstants from '../server/server_constants';
import { validator } from "./services/validation/ValidatorService";

export class GameSession {
    private enrolment: EnrolmentProcessor | null;
    private setup: SetupProcessor | null = null;
    private play: PlayProcessor | null = null;

    constructor() {
        this.enrolment = new EnrolmentProcessor(this.getNewState());
        console.info('Game session created');
    }

    public localReset() {
        this.play?.killIdleChecks();
        this.play = null;
        this.setup = null;
        this.enrolment = new EnrolmentProcessor(this.getNewState());
    }

    private wipeSession(request: ClientRequest, state: GameState): ResetResponse | null {
        const { playerColor } = request;
        const { sessionOwner } = state;

        if (playerColor != sessionOwner)
            return null;

        this.play?.killIdleChecks();
        this.play = null;
        this.setup = null;
        this.enrolment = new EnrolmentProcessor(this.getNewState());

        return { resetFrom: request.playerName || request.playerColor || 'anon'};
    }

    public processAction(request: ClientRequest): WsDigest {

        switch (true) {
            case !!this.enrolment:
                return this.processEnrolmentAction(this.enrolment, request);
            case !!this.setup:
                return this.processSetupAction(this.setup, request);
            case !!this.play:
                return this.processPlayAction(this.play, request);
            default:
                return this.issueNominalDigest(lib.issueErrorResponse('State is missing in session.'));
        }
    }

    // MARK: COMMON
    private processChat(request: ClientRequest, state: GameState): ErrorResponse | GameStateResponse {
        const { playerColor, playerName, message } = request;
        const chatPayload = validator.validateChatPayload(message.payload);

        if (!chatPayload)
            return lib.validationErrorResponse();

        state.chat.push({
            id: playerColor,
            name: playerName || playerColor,
            message: chatPayload.input,
        });

        return { state };
    }

    private processStatusRequest(state: PlayState): GameStateResponse { // TODO: Investigate the need for client sending this,
        state.isStatusResponse = true;

        return { state };
    }

    // MARK: ENROL
    private processEnrolmentAction(processor: EnrolmentProcessor, request: ClientRequest): WsDigest {
        const { playerColor, playerName, message } = request;
        const { action } = message;

        switch (action) {
            case Action.inquire:
                return this.issueNominalDigest({ state: processor.getState()});
            case Action.chat:
                return this.issueBroadcastDigest(this.processChat(request, processor.getState()));
            case Action.reset: {
                const response = this.wipeSession(request, processor.getState());

                if (!response)
                    return this.issueNominalDigest(lib.issueErrorResponse(
                        'Only session owner may reset.',
                        { playerColor, sessionOwner: processor.getState().sessionOwner },
                    ));

                    return this.issueBroadcastDigest(response);
                }
            case Action.enrol:
                return this.issueBroadcastDigest(processor.processEnrol(playerColor, playerName));
            case Action.start_setup: {
                const { gameId, sessionOwner, players, chat } = processor.getState();

                if (!gameId || !sessionOwner || !players.length) {
                    return this.issueNominalDigest(lib.issueErrorResponse(
                        'Setup data is incomplete',
                        { enrolmentState: processor.getState() },
                    ));
                }

                this.enrolment = null;
                this.setup = new SetupProcessor({ gameId, sessionOwner, players, chat });

                return this.issueBroadcastDigest({ state: this.setup.getState() });
            }
            default:
                return this.issueNominalDigest(
                    lib.issueErrorResponse('Unsupported enrol action', { action }),
                );
        }
    }

    // MARK: SETUP
    private processSetupAction(processor: SetupProcessor, request: ClientRequest) {
        const { message, playerColor } = request;
        const { action, payload } = message;

        switch(action) {
            case Action.inquire:
                return this.issueNominalDigest({ state: processor.getState()});
            case Action.chat:
                return this.issueBroadcastDigest(this.processChat(request, processor.getState()));
            case Action.reset: {
                const response = this.wipeSession(request, processor.getState());

                if (!response) {
                    return this.issueNominalDigest(lib.issueErrorResponse(
                        'Only session owner may reset.',
                        { playerColor, sessionOwner: processor.getState().sessionOwner },
                    ));
                }

                return this.issueBroadcastDigest(response);
            }
            // case select_specialist
            case Action.start_play: {
                const { privateState, playState } = processor.processStart(
                    payload
                );
                this.enrolment = null;
                this.setup = null;
                this.play = new PlayProcessor({ privateState, playState });
                return this.issueBroadcastDigest({ state: playState.toDto() });
            }
        }
        return this.issueNominalDigest(
            lib.issueErrorResponse('Unsupported setup action', { action }),
        );
    }

    // MARK: PLAY
    public processPlayAction(processor: PlayProcessor, request: ClientRequest): WsDigest {

        const { playerColor, message } = request;
        const { action, payload } = message;

        if (!playerColor)
            return this.issueNominalDigest(lib.issueErrorResponse('No player ID provided'));

        if (action === Action.inquire)
            return this.issueNominalDigest({ state: processor.getState() })

        if (action === Action.get_status)
            return this.issueNominalDigest(this.processStatusRequest(processor.getState()));

        if (action === Action.reset) {
            const result = this.wipeSession(request, processor.getState());

            if (!result)
                return this.issueNominalDigest(lib.issueErrorResponse(
                    'Only session owner may reset.',
                    { playerColor, sessionOwner: processor.getState().sessionOwner }
                ));

            return this.issueBroadcastDigest(result);
        }

        const playerObject = processor.getState().players.find(p => p.id === playerColor);

        if (!playerObject)
            return this.issueNominalDigest(
                lib.issueErrorResponse(`Player does not exist: ${playerColor}`),
            );

        const player = new PlayerHandler(playerObject);
        player.refreshTimeStamp();

        const digest: DataDigest = { player, payload }

        if (action === Action.chat)
            return this.issueBroadcastDigest(this.processChat(request, processor.getState()));

        if (!player.isActivePlayer())
            return this.issueNominalDigest(lib.issueErrorResponse(
                `It is not [${player.getIdentity().name}]'s turn!`,
            ));

        const actionsWhileFrozen: Array<Action> = [
            Action.drop_item,
            Action.reposition,
            Action.reposition_rival,
            Action.move_rival,
            Action.end_rival_turn,
            Action.shift_market,
            Action.chat,
        ];

        if (player.isFrozen() && !actionsWhileFrozen.includes(action))
            return this.issueNominalDigest(lib.issueErrorResponse(
                `[${player.getIdentity().name}] is handling rival and cannot act.`,
            ));

        const result = (() => {
            switch (action) {
                case Action.spend_favor:
                    return processor.processFavorSpending(digest);
                case Action.move:
                    return processor.processMove(digest);
                case Action.move_rival:
                    return processor.processMove(digest, true);
                case Action.reposition:
                    return processor.processRepositioning(digest);
                case Action.reposition_rival:
                    return processor.processRepositioning(digest, true);
                case Action.load_good:
                    return processor.processLoadGood(digest);
                case Action.make_trade:
                    return processor.processGoodsTrade(digest);
                case Action.buy_metals:
                    return processor.processMetalPurchase(digest);
                case Action.donate_metals:
                    return processor.processMetalDonation(digest);
                case Action.end_turn:
                    return processor.processEndTurn(digest);
                case Action.end_rival_turn:
                    return processor.processRivalTurn(digest);
                case Action.shift_market:
                    return processor.processRivalTurn(digest, true);
                case Action.upgrade_cargo:
                    return processor.processUpgrade(digest);
                case Action.drop_item:
                    return processor.processItemDrop(digest);
                default:
                    return lib.issueErrorResponse(`Unknown action: ${action}`);
            }
        })();

        if ('error' in result)
            return this.issueNominalDigest(result);

        return this.issueBroadcastDigest(result);
    }

    private issueNominalDigest(message: ServerMessage): WsDigest {

        return { senderOnly: true, message }
    }

    private issueBroadcastDigest(message: ServerMessage): WsDigest {

        return { senderOnly: false, message }
    }

    private getNewState() {
        const state = JSON.parse(JSON.stringify(serverConstants.DEFAULT_NEW_STATE)) as EnrolmentState;
        const gameId = randomUUID();

        return { ...state, gameId }
    }
}
