import {WsDigest, DataDigest } from "./server_types";
import { randomUUID } from 'crypto';
import {
    ClientRequest, ServerMessage, Action, ResetResponse, GameState, Phase,
    PlayState,
    RequestMatch,
    PlayerDraft,
    ErrorResponse,
} from "./../shared_types";
import { PlayerHandler } from './state_handlers/PlayerHandler';
import lib, { Probable } from './action_processors/library'
import { PlayProcessor } from './action_processors/PlayProcessor';
import { SetupProcessor } from './action_processors/SetupProcessor';
import { EnrolmentProcessor } from './action_processors/EnrolmentProcessor';
import serverConstants from '../server/server_constants';
import { SINGLE_PLAYER } from "./configuration";

export class GameSession {
    private actionProcessor: EnrolmentProcessor | SetupProcessor | PlayProcessor;
    private autoBroadcast: (state: PlayState) => void

    constructor(broadcastCallback: (state: PlayState) => void) {
        this.actionProcessor = new EnrolmentProcessor(this.getNewState());
        this.autoBroadcast = broadcastCallback
        console.info('Game session created');
    }

    public resetSession() {
        if ('killIdleChecks' in this.actionProcessor) {
            (this.actionProcessor as PlayProcessor).killIdleChecks();
        }

        this.actionProcessor = new EnrolmentProcessor(this.getNewState());
        console.log('Session was reset')
    }

    public processAction(request: ClientRequest): WsDigest {
        const state = this.actionProcessor.getState();

        if (request.message.action === Action.inquire)
            return this.issueNominalResponse({ state });

        if (request.message.action === Action.enrol && state.sessionPhase === Phase.enrolment)
            return this.processEnrolmentAction(request);

        const validation = this.confirmPlayer(request);

        if (validation.err) {
            return this.issueNominalResponse(lib.issueErrorResponse(
                'Invalid client request!',
                { reason: validation.message }
            ));
        }

        if (request.message.action === Action.declare_reset) {
            const { player } = validation.data;
            const { sessionOwner } = state;

            if (player.color != sessionOwner){
                return this.issueNominalResponse(
                    lib.issueErrorResponse('Only session owner may reset.')
                );
            }

            this.resetSession();

            return this.issueGroupResponse({ resetFrom: player.name });
        }

        switch (state.sessionPhase) {
            case Phase.play:
                return this.processPlayAction(validation.data);
            case Phase.setup:
                return this.processSetupAction(validation.data);
            case Phase.enrolment:
                return this.processEnrolmentAction(validation.data);
            default:
                return this.issueNominalResponse(lib.issueErrorResponse('Unknown game phase!'));
        }
    }

    // MARK: ENROL
    private processEnrolmentAction(data: RequestMatch | ClientRequest): WsDigest {
        const processor = this.actionProcessor as EnrolmentProcessor;

        if (data.message.action === Action.enrol && 'playerColor' in data) {
            const { playerColor, playerName } = data;

            if (!playerColor || !playerName)
                return this.issueNominalResponse(lib.issueErrorResponse('Missing enrolment data!'));

            return this.issueGroupResponse(processor.processEnrol(
                playerColor,
                playerName,
            ));
        }

        if (!('player' in data)) {
            return this.issueNominalResponse(lib.issueErrorResponse(
                `Player [${data.playerColor}] is not enrolled`)
            );
        }

        const { message, player } = data;
        const { action, payload } = message;

        const state = processor.getState();

        switch (action) {
            case Action.chat:
                return this.issueGroupResponse(processor.processChat(player, payload));
            case Action.start_setup: {
                const { gameId, sessionOwner, players, chat } = state;

                if (!sessionOwner || !players.length || !SINGLE_PLAYER && players.length < 2) {
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
    private processSetupAction(request: RequestMatch) {
        const processor = this.actionProcessor as SetupProcessor;

        const { message, player } = request;
        const { action, payload } = message;

        if (action === Action.chat) {
            const result = processor.processChat(player, payload);

            if (result.err)
                return this.issueNominalResponse(lib.issueErrorResponse(result.message));

            return this.issueGroupResponse(lib.issueStateResponse(this.actionProcessor.getState()))
        }

        if (!('specialist' in player)) {
            return this.issueNominalResponse(
                lib.issueErrorResponse('Player entity is unfit', { action, player }),
            );
        }

        // TODO: wrap in an autofunction and have the processor return state or error
        switch (action) {
            case Action.pick_specialist: {
                    return this.issueGroupResponse(processor.processSpecialistSelection((player as PlayerDraft), payload ))
            }
            case Action.start_play: {
                const bundleResult = processor.processStart(payload);

                if (bundleResult.err)
                    return this.issueGroupResponse(lib.issueErrorResponse(
                        'Cannot start game!',
                        {reason: bundleResult.message}
                    ));

                const { privateState, playState } = bundleResult.data;
                this.actionProcessor = new PlayProcessor({ privateState, playState }, this.autoBroadcast);

                return this.issueGroupResponse({ state: playState.toDto() });
            }
        }

        return this.issueNominalResponse(
            lib.issueErrorResponse('Unsupported setup action', { action }),
        );
    }

    // MARK: PLAY
    public processPlayAction(request: RequestMatch): WsDigest {
        const processor = this.actionProcessor as PlayProcessor;

        const { player, message } = request;
        const { action, payload } = message;

        if (!('timeStamp' in player)) {
            return this.issueNominalResponse(
                lib.issueErrorResponse('Player entity is unfit', { action, player }),
            );
        }

        const playerHandler = new PlayerHandler(player);
        playerHandler.refreshTimeStamp();

        const digest: DataDigest = { player: playerHandler, payload }

        if (!playerHandler.isActivePlayer() && ![Action.chat, Action.force_turn].includes(action))
            return this.issueNominalResponse(lib.issueErrorResponse(
                `It is not [${playerHandler.getIdentity().name}]'s turn!`,
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

        if (playerHandler.isFrozen() && !actionsWhileFrozen.includes(action)) {
            return this.issueNominalResponse(lib.issueErrorResponse(
                `[${playerHandler.getIdentity().name}] is handling rival and cannot act.`,
            ));
        }

        const result = (() => {
            switch (action) {
                case Action.chat:
                    return processor.processChat(digest);
                case Action.force_turn:
                    return processor.processForcedTurn(digest);
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

    private confirmPlayer(request: ClientRequest): Probable<RequestMatch>  {
        const { gameId, clientId, playerColor, playerName, message } = request;

        if (!gameId || !clientId || !playerColor || !playerName)
            return lib.fail(`Request data is incomplete`);

        const player = this.actionProcessor.getState().players.find(p => p.color === playerColor);

        if (!player)
            return lib.fail(`Cannot find player [${playerColor}] in state`);

        return lib.pass({ player, message });
    }
}
