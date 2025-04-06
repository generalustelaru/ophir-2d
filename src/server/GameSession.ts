import {WsDigest, DataDigest } from "./server_types";
import { randomUUID } from 'crypto';
import { ClientRequest, ServerMessage, Action, EnrolmentState, ResetResponse, PlayState, Phase, PlayStateResponse, ErrorResponse } from "./../shared_types";
import { PlayStateHandler } from "./state_handlers/PlayStateHandler";
import { PlayerHandler } from './state_handlers/PlayerHandler';
import lib from './action_processors/library'
import { PlayProcessor } from './action_processors/PlayProcessor';
import { SetupProcessor } from './action_processors/SetupProcessor';
import { EnrolmentProcessor } from './action_processors/EnrolmentProcessor';
import serverConstants from '../server/server_constants';

export class GameSession {
    private gameState: PlayStateHandler | null = null;
    private enrol: EnrolmentProcessor | null;
    private setup: SetupProcessor | null = null;
    private play: PlayProcessor | null = null;

    constructor() {
        this.enrol = new EnrolmentProcessor(this.getNewState());
        console.info('Game session created');
    }

    public localReset() {
        this.play?.killIdleChecks();
        this.play = null;
        this.setup = null;
        this.enrol = new EnrolmentProcessor(this.getNewState());
    }

    private wipeSession(request: ClientRequest, state: EnrolmentState|PlayState): ResetResponse | null {
        const { playerColor } = request;
        const { sessionOwner } = state;
        if (playerColor != sessionOwner) {
            return null;
        }

        this.play?.killIdleChecks();
        this.play = null;
        this.setup = null;
        this.enrol = new EnrolmentProcessor(this.getNewState());

        return { resetFrom: request.playerName || request.playerColor || 'anon'};
    }

    public processAction(request: ClientRequest): WsDigest {
        switch (true) {
            case Boolean(this.enrol):
                return this.processEnrolAction(request);
            case Boolean(this.setup):
                return this.processSetupAction(request);
            case Boolean(this.play):
                return this.processPlayAction(request);
            default:
                return this.issueNominalDigest(lib.issueErrorResponse('State is missing in session.'));
        }
    }

    // MARK: ENROL
    private processEnrolAction(request: ClientRequest): WsDigest {

        if (!this.enrol)
            return this.issueNominalDigest({ error: 'Could not resolve enrol state' });

        const { playerColor, playerName, message } = request;
        const { action, payload } = message;

        switch (action) {
            case Action.inquire:
                return this.issueNominalDigest({ gamePhase: Phase.enrolment, state: this.enrol.getState()});
            case Action.enrol:
                return this.issueBroadcastDigest(this.enrol.processEnrol(playerColor, playerName));
            case Action.chat:
                return this.issueBroadcastDigest(this.enrol.processChat(request));
            case Action.reset: {
                const response = this.wipeSession(request, this.enrol.getState());

                if (!response)
                    return this.issueNominalDigest(lib.issueErrorResponse(
                        'Only session owner may reset.',
                        { playerColor, sessionOwner: this.enrol.getState().sessionOwner }
                    ));

                return this.issueBroadcastDigest(response);
            }
            case Action.start: {
                this.setup = new SetupProcessor();
                const { privateState, playState: gameState } = this.setup.processStart(
                    this.enrol.getState(),
                    payload
                );
                this.gameState = gameState;
                this.enrol = null;
                this.setup = null;
                this.play = new PlayProcessor({ privateState, playState: gameState });

                return this.issueBroadcastDigest({ gamePhase: Phase.play, state: gameState.toDto() });
            }
            default:
                return this.issueNominalDigest(
                    lib.issueErrorResponse(`Unsupported enrol action: [${action}]`),
                );
        }
    }

    // MARK: SETUP
    private processSetupAction(request: ClientRequest) {
        const { action } = request.message;
        return this.issueNominalDigest(
            lib.issueErrorResponse('Action not supported!', { action }),
        );
    }

    // MARK: PLAY
    public processPlayAction(request: ClientRequest): WsDigest {

        if (!this.play)
            return this.issueNominalDigest(lib.issueErrorResponse('Session is not in play!'));

        const { playerColor, message } = request;
        const { action, payload } = message;

        if (!playerColor)
            return this.issueNominalDigest(lib.issueErrorResponse('No player ID provided'));

        if (action === Action.inquire)
            return this.issueNominalDigest({ gamePhase: Phase.play, state: this.play.getState() })

        if (action === Action.get_status)
            return this.issueNominalDigest(this.processStatusRequest());

        if (action === Action.reset) {
            const result = this.wipeSession(request, this.play.getState());

            if (!result)
                return this.issueNominalDigest(lib.issueErrorResponse(
                    'Only session owner may reset.',
                    { playerColor, sessionOwner: this.play.getState().sessionOwner }
                ));

            return this.issueBroadcastDigest(result);
        }

        const playerObject = this.gameState?.getPlayer(playerColor);

        if (!playerObject)
            return this.issueNominalDigest(
                lib.issueErrorResponse(`Player does not exist: ${playerColor}`),
            );

        const player = new PlayerHandler(playerObject);
        player.refreshTimeStamp();

        const digest: DataDigest = { player, payload }

        if (action === Action.chat)
            return this.issueBroadcastDigest(this.play.processChat(digest));

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
        ];

        if (player.isFrozen() && !actionsWhileFrozen.includes(action))
            return this.issueNominalDigest(lib.issueErrorResponse(
                `[${player.getIdentity().name}] is handling rival and cannot act.`,
            ));

        const result = (() => {
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
        })();

        if ('error' in result)
            return this.issueNominalDigest(result);

        return this.issueBroadcastDigest(result);
    }

    private processStatusRequest(): ErrorResponse | PlayStateResponse {
        const stateDto = this.gameState?.toDto();

        if (stateDto) {
            stateDto.isStatusResponse = true;

            return { gamePhase: Phase.play, state: stateDto };
        }

        return lib.issueErrorResponse('status update is not suppoorted at this time.');
    }

    private issueNominalDigest(message: ServerMessage): WsDigest {

        return { senderOnly: true, message }
    }

    private issueBroadcastDigest(message: ServerMessage): WsDigest {

        return { senderOnly: false, message }
    }

    private getNewState() {
        const lobbyState = JSON.parse(JSON.stringify(serverConstants.DEFAULT_NEW_STATE)) as EnrolmentState;
        const gameId = randomUUID();

        return { ...lobbyState, gameId }
    }
}
