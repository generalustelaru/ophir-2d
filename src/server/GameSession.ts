import {WsDigest, DataDigest, SavedSession } from "~/server_types";
import { randomUUID } from 'crypto';
import {
    ClientRequest, ServerMessage, Action, Phase, PlayState, PlayerDraft, StateResponse, PlayerColor,
} from "~/shared_types";
import { RequestMatch } from "~/server_types";
import { PlayerHandler } from './state_handlers/PlayerHandler';
import lib, { Probable } from './action_processors/library'
import { PlayProcessor } from './action_processors/PlayProcessor';
import { SetupProcessor } from './action_processors/SetupProcessor';
import { EnrolmentProcessor } from './action_processors/EnrolmentProcessor';
import serverConstants from "~/server_constants";
import { SINGLE_PLAYER } from "./configuration";
import { PrivateStateHandler } from "./state_handlers/PrivateStateHandler";
import { PlayStateHandler } from "./state_handlers/PlayStateHandler";
import { SERVER_NAME } from "./configuration"

export class GameSession {
    private actionProcessor: EnrolmentProcessor | SetupProcessor | PlayProcessor;
    private autoBroadcast: (state: PlayState) => void;
    private transmitVp: (vp: number, socketId: string ) => void;
    private transmitEnrolment: (approvedColor: PlayerColor, socketId: string ) => void;

    constructor(
        broadcastCallback: (state: PlayState) => void,
        transmitCallback: (socketId: string, message: ServerMessage) => void,
        savedSession: SavedSession | null,
    ) {

        this.autoBroadcast = broadcastCallback;
        this.transmitVp = (vp, socketId) => {
            transmitCallback(socketId, { vp });
        }
        this.transmitEnrolment = (approvedColor, socketId) => {
            transmitCallback(socketId, { approvedColor });
        }

        if (!savedSession) {
            this.actionProcessor = new EnrolmentProcessor(this.getNewState(), this.transmitEnrolment);
            console.info('New game session created');

            return;
        }

        const { sharedState, privateState } = savedSession;
        const { gameId, sessionOwner, players, chat } = sharedState;

        this.actionProcessor = (() => {
            switch (sharedState.sessionPhase) {
                case Phase.play:
                    return new PlayProcessor(
                        {
                            playState: new PlayStateHandler(SERVER_NAME, sharedState),
                            privateState: new PrivateStateHandler(privateState!),
                        },
                        this.autoBroadcast,
                        this.transmitVp
                    );

                case Phase.setup:
                    return new SetupProcessor(
                        { gameId, sessionOwner:(sessionOwner as PlayerColor), players, chat },
                    );

                case Phase.enrolment:
                    return new EnrolmentProcessor(sharedState, this.transmitEnrolment);

                default:
                    throw new Error('Cannot determine session phase');
            }
        })();
    }

    public getCurrentSession() {
        const state = this.actionProcessor.getState();
        return {
            sharedState: state,
            privateState: state.sessionPhase === Phase.play
                ? (this.actionProcessor as PlayProcessor).getPrivateState()
                : null,
        };
    }

    public resetSession() {
        if ('killIdleChecks' in this.actionProcessor) {
            (this.actionProcessor as PlayProcessor).killIdleChecks();
        }

        this.actionProcessor = new EnrolmentProcessor(this.getNewState(), this.transmitEnrolment);
        console.log('Session was reset')
    }

    public processAction(request: ClientRequest): WsDigest {
        const state = this.actionProcessor.getState();

        if (request.message.action === Action.inquire)
            return this.issueNominalResponse({ state });

        if (request.message.action === Action.enrol && state.sessionPhase === Phase.enrolment)
            return this.processEnrolmentAction(request);

        const match = this.matchRequestToPlayer(request);

        if (match.err) {
            console.info('Resetting client;',match.message);

            return this.issueNominalResponse({ resetFrom: SERVER_NAME })
        }

        if (request.message.action === Action.declare_reset) {
            const { player } = match.data;
            const { sessionOwner, sessionPhase } = state;

            if (player.color === sessionOwner || (sessionPhase === Phase.play && state.hasGameEnded)) {
                this.resetSession();

                return this.issueGroupResponse({ resetFrom: player.name });
            }

            return this.issueNominalResponse(
                lib.errorResponse('Only session owner may reset.')
            );
        }

        switch (state.sessionPhase) {
            case Phase.play:
                return this.processPlayAction(match.data);
            case Phase.setup:
                return this.processSetupAction(match.data);
            case Phase.enrolment:
                return this.processEnrolmentAction(match.data);
            default:
                return this.issueNominalResponse(lib.errorResponse('Unknown game phase!'));
        }
    }

    // MARK: ENROL
    private processEnrolmentAction(data: RequestMatch | ClientRequest): WsDigest {
        const processor = this.actionProcessor as EnrolmentProcessor;

        if (data.message.action === Action.enrol) {

            if (!('socketId' in data))
                return this.issueNominalResponse(lib.errorResponse('socketId missing!'));

            const { socketId, message } = data;

            const enrolment = processor.processEnrol(socketId, message.payload);

            if (enrolment.err)
                return this.issueNominalResponse(lib.errorResponse(enrolment.message));

            return this.issueGroupResponse(enrolment.data);
        }

        if (!('player' in data)) {
            return this.issueNominalResponse(lib.errorResponse(
                `Player [${data.playerColor}] is not enrolled`)
            );
        }

        const { message, player } = data;
        const { action, payload } = message;

        const state = processor.getState();

        const enrolUpdate = ((): Probable<StateResponse> => {
            switch (action) {
                case Action.chat:
                    return processor.processChat(player, payload);
                case Action.start_setup: {
                    const { gameId, sessionOwner, players, chat } = state;

                    if (!sessionOwner || !players.length || !SINGLE_PLAYER && players.length < 2)
                        return lib.fail('Setup data is incomplete');

                    try {
                        this.actionProcessor = new SetupProcessor({ gameId, sessionOwner, players, chat });
                    } catch (error) {
                        return lib.fail(String(error));
                    }

                    return lib.pass({ state: this.actionProcessor.getState() });
                }
                default:
                    return lib.fail('Unsupported enrol action');
            }
        })();

        if (enrolUpdate.err)
            return this.issueNominalResponse(lib.errorResponse(enrolUpdate.message));

        return this.issueGroupResponse(enrolUpdate.data);

    }

    // MARK: SETUP
    private processSetupAction(match: RequestMatch) {
        const processor = this.actionProcessor as SetupProcessor;

        const { message, player } = match;
        const { action, payload } = message;

        if (action === Action.chat) {
            const chatUpdate = processor.processChat(player, payload);

            if (chatUpdate.err)
                return this.issueNominalResponse(lib.errorResponse(chatUpdate.message));

            return this.issueGroupResponse(lib.stateResponse(this.actionProcessor.getState()))
        }

        if (!('specialist' in player)) {
            return this.issueNominalResponse(
                lib.errorResponse('Player entity is missing properties', { action, player }),
            );
        }

        const setupUpdate = ((): Probable<StateResponse> => {
            switch (action) {
                case Action.pick_specialist:
                    return processor.processSpecialistSelection((player as PlayerDraft), payload )
                case Action.start_play: {
                    const bundleResult = processor.processStart(payload);

                    if (bundleResult.err)
                        return lib.fail('Cannot start game!');

                    const { privateState, playState } = bundleResult.data;

                    try {
                        this.actionProcessor = new PlayProcessor(
                            { privateState, playState },
                            this.autoBroadcast,
                            this.transmitVp,
                        );
                    } catch (error) {
                        return lib.fail(String(error));
                    }

                    return lib.pass({ state: playState.toDto() });
                }
                default:
                    return lib.fail('Unsupported setup action');
            }
        })();

        if (setupUpdate.err)
            return this.issueNominalResponse(lib.errorResponse(setupUpdate.message));

        return this.issueGroupResponse(setupUpdate.data);
    }

    // MARK: PLAY
    public processPlayAction(match: RequestMatch): WsDigest {
        const processor = this.actionProcessor as PlayProcessor;

        const { player, message } = match;
        const { action, payload } = message;

        if (!('timeStamp' in player)) {
            return this.issueNominalResponse(
                lib.errorResponse('Player entity is missing properties', { action, player }),
            );
        }

        const playerHandler = new PlayerHandler(player);
        playerHandler.refreshTimeStamp();

        const digest: DataDigest = { player: playerHandler, payload }

        if (!playerHandler.isActivePlayer() && ![Action.chat, Action.force_turn].includes(action))
            return this.issueNominalResponse(lib.errorResponse(
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
            return this.issueNominalResponse(lib.errorResponse(
                `[${playerHandler.getIdentity().name}] is handling rival and cannot act.`,
            ));
        }

        const playUpdate = ((): Probable<StateResponse> => {
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
                case Action.sell_goods:
                    return processor.processSellGoods(digest);
                case Action.donate_goods:
                    return processor.donateGoods(digest);
                case Action.sell_specialty:
                    return processor.processSellSpecialty(digest);
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
                    return lib.fail(`Unknown action: ${action}`);
            }
        })();

        if (playUpdate.err)
            return this.issueNominalResponse(lib.errorResponse(playUpdate.message));

        return this.issueGroupResponse(playUpdate.data);
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

    private matchRequestToPlayer(request: ClientRequest): Probable<RequestMatch>  {
        const { gameId, socketId, playerColor, playerName, message } = request;

        if (!gameId || !socketId || !playerColor || !playerName)
            return lib.fail(`Request data is incomplete`);

        const player = this.actionProcessor.getState().players.find(p => p.color === playerColor);

        if (!player)
            return lib.fail(`Cannot find player [${playerColor}] in state`);

        if (player.name != playerName)
            return lib.fail(`[${playerName}] does not match name [${player.name}] in state`);

        return lib.pass({ player: {...player, socketId}, message });
    }
}
