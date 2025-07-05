import {WsDigest, DataDigest } from "./server_types";
import { randomUUID } from 'crypto';
import {
    ClientRequest, ServerMessage, Action, ResetResponse, PlayState, GameStateResponse, GameState, Phase,
} from "./../shared_types";
import { PlayerHandler } from './state_handlers/PlayerHandler';
import lib from './action_processors/library'
import { PlayProcessor } from './action_processors/PlayProcessor';
import { SetupProcessor } from './action_processors/SetupProcessor';
import { EnrolmentProcessor } from './action_processors/EnrolmentProcessor';
import serverConstants from '../server/server_constants';
import { validator } from "./services/validation/ValidatorService";

export class GameSession {
    private actionProcessor: EnrolmentProcessor | SetupProcessor | PlayProcessor;

    constructor() {
        this.actionProcessor = new EnrolmentProcessor(this.getNewState());
        console.info('Game session created');
    }

    public resetSession() {
        if (this.actionProcessor.hasOwnProperty('killIdleChecks')) {
            (this.actionProcessor as PlayProcessor).killIdleChecks();
        }

        this.actionProcessor = new EnrolmentProcessor(this.getNewState());
    }

    private processReset(request: ClientRequest, state: GameState): ResetResponse | null {
        const { playerColor } = request;
        const { sessionOwner } = state;

        if (playerColor != sessionOwner)
            return null;

        this.resetSession();

        return { resetFrom: request.playerName || request.playerColor || 'anon'};
    }

    public processAction(request: ClientRequest): WsDigest {
        const state = this.actionProcessor.getState();

        if (request.message.action === Action.inquire) {
            return this.issueNominalResponse({ state });
        }

        switch (state.sessionPhase) {
            case Phase.play:
                return this.processPlayAction(request);
            case Phase.setup:
                return this.processSetupAction(request);
            case Phase.enrolment:
                return this.processEnrolmentAction(request);
            default:
                return this.issueNominalResponse(lib.issueErrorResponse('Unknown game phase!'));
        }
    }

    // MARK: COMMON

    private processStatusRequest(state: PlayState): GameStateResponse { // TODO: Investigate the need for client sending this,
        state.isStatusResponse = true;

        return { state };
    }

    // MARK: ENROL
    private processEnrolmentAction(request: ClientRequest): WsDigest {
        const processor = this.actionProcessor as EnrolmentProcessor;

        if (request.message.action === Action.enrol) {
            const {playerColor, playerName} = request;

            if (!playerColor || !playerName)
                return this.issueNominalResponse(lib.issueErrorResponse('Missing enrolment data!'));

            return this.issueGroupResponse(processor.processEnrol(
                playerColor,
                playerName,
            ));
        }

        const { playerRequest, playerOk } = this.confirmPlayer(request);

        if (!playerRequest || !playerOk)
            return this.issueNominalResponse(lib.issueErrorResponse('Invalid client request!'));

        const { message, playerColor } = playerRequest;


        const { action, payload } = message;
        const state = processor.getState();

        const playerEntry = state.players.find(p => p.id === playerColor)!;

        switch (action) {
            case Action.chat:
                return this.issueGroupResponse(processor.processChat(playerEntry, payload));
            case Action.reset: {
                const response = this.processReset(request, state);

                if (!response)
                    return this.issueNominalResponse(lib.issueErrorResponse(
                        'Only session owner may reset.',
                        { playerColor, sessionOwner: state.sessionOwner },
                    ));

                    return this.issueGroupResponse(response);
                }
            case Action.start_setup: {
                const { gameId, sessionOwner, players, chat } = state;

                if (!sessionOwner || !players.length) {
                    return this.issueNominalResponse(lib.issueErrorResponse(
                        'Setup data is incomplete',
                        { enrolmentState: state },
                    ));
                }

                this.actionProcessor = new SetupProcessor({ gameId, sessionOwner, players, chat });

                return this.issueGroupResponse({ state: this.actionProcessor.getState() });
            }
            default:
                return this.issueNominalResponse(
                    lib.issueErrorResponse('Unsupported enrol action', { action }),
                );
        }
    }

    // MARK: SETUP
    private processSetupAction(request: ClientRequest) {
        const processor = this.actionProcessor as SetupProcessor;

        const { playerRequest, playerOk } = this.confirmPlayer(request);

        if (!playerRequest || !playerOk)
            return this.issueNominalResponse(lib.issueErrorResponse('Invalid player client!'));

        const { message, playerColor } = playerRequest;
        const { action, payload } = message;
        const state = processor.getState();

        const playerBuild = state.players.find(p => p.id === playerColor)!;

        switch(action) {
            case Action.chat:
                return this.issueGroupResponse(processor.processChat(playerBuild, payload));
            case Action.reset: {
                const response = this.processReset(request, state);

                if (!response) {
                    return this.issueNominalResponse(lib.issueErrorResponse(
                        'Only session owner may reset.',
                        { playerColor, sessionOwner: state.sessionOwner },
                    ));
                }

                return this.issueGroupResponse(response);
            }
            // case select_specialist
            case Action.start_play: {
                const { privateState, playState } = processor.processStart(
                    payload
                );
                this.actionProcessor = new PlayProcessor({ privateState, playState });
                return this.issueGroupResponse({ state: playState.toDto() });
            }
        }
        return this.issueNominalResponse(
            lib.issueErrorResponse('Unsupported setup action', { action }),
        );
    }

    // MARK: PLAY
    public processPlayAction(request: ClientRequest): WsDigest {
        const processor = this.actionProcessor as PlayProcessor;

        const { playerRequest, playerOk } = this.confirmPlayer(request);

        if (!playerRequest || !playerOk)
            return this.issueNominalResponse(lib.issueErrorResponse('Invalid player client!'));

        const { playerColor, message } = playerRequest;
        const { action, payload } = message;

        if (action === Action.get_status)
            return this.issueNominalResponse(this.processStatusRequest(processor.getState()));

        if (action === Action.reset) {
            const result = this.processReset(request, processor.getState());

            if (!result)
                return this.issueNominalResponse(lib.issueErrorResponse(
                    'Only session owner may reset.',
                    { playerColor, sessionOwner: processor.getState().sessionOwner }
                ));

            return this.issueGroupResponse(result);
        }

        const player = new PlayerHandler(
            processor.getState().players.find(p => p.id === playerColor)!
        );

        player.refreshTimeStamp();

        const digest: DataDigest = { player, payload }

        if (action === Action.chat)
            return this.issueGroupResponse(processor.processChat(digest));

        if (!player.isActivePlayer())
            return this.issueNominalResponse(lib.issueErrorResponse(
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
            return this.issueNominalResponse(lib.issueErrorResponse(
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
            return this.issueNominalResponse(result);

        return this.issueGroupResponse(result);
    }

    private issueNominalResponse(message: ServerMessage): WsDigest {
        return { senderOnly: true, message }
    }

    private issueGroupResponse(message: ServerMessage): WsDigest {
        return { senderOnly: false, message }
    }

    private getNewState() {
        const state = JSON.parse(JSON.stringify(serverConstants.DEFAULT_NEW_STATE));
        const gameId = randomUUID();

        return { ...state, gameId }
    }

    private confirmPlayer(request: ClientRequest) {
        const playerRequest = validator.validatePlayerRequest(request);

        const playerOk = playerRequest
            ? Boolean(this.actionProcessor.getState().players
                .find(p => p.id === playerRequest.playerColor)
            )
            : false

        return { playerRequest, playerOk };
    }
}
