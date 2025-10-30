import { WsDigest, DataDigest, SavedSession, Probable } from '~/server_types';
import { randomUUID } from 'crypto';
import {
    ClientRequest, ServerMessage, Action, Phase, PlayState, PlayerDraft, StateResponse, PlayerColor,
} from '~/shared_types';
import { RequestMatch } from '~/server_types';
import { PlayerHandler } from './state_handlers/PlayerHandler';
import lib from './action_processors/library';
import { PlayProcessor } from './action_processors/PlayProcessor';
import { SetupProcessor } from './action_processors/SetupProcessor';
import { EnrolmentProcessor } from './action_processors/EnrolmentProcessor';
import serverConstants from '~/server_constants';
import { PrivateStateHandler } from './state_handlers/PrivateStateHandler';
import { PlayStateHandler } from './state_handlers/PlayStateHandler';
import { SERVER_NAME, SINGLE_PLAYER  } from '../server/configuration';
import { validator } from './services/validation/ValidatorService';
import { BackupStateHandler } from './state_handlers/BackupStateHandler';

export class GameSession {
    private actionProcessor: EnrolmentProcessor | SetupProcessor | PlayProcessor;
    private autoBroadcast: (state: PlayState) => void;
    private transmitVp: (vp: number, socketId: string ) => void;
    private transmitEnrolment: (approvedColor: PlayerColor, socketId: string ) => void;
    private transmitNameUpdate: (newName: string, socketId: string) => void;
    private transmitTurnNotification: (socketId: string) => void;
    private transmitForceTurnNotification: (socketId: string) => void;
    private transmitRivalControlNotification: (socketId: string) => void;


    constructor(
        broadcastCallback: (state: PlayState) => void,
        transmitCallback: (socketId: string, message: ServerMessage) => void,
        savedSession: SavedSession | null,
    ) {

        this.autoBroadcast = broadcastCallback;
        this.transmitVp = (vp, socketId) => {
            transmitCallback(socketId, { vp });
        };
        this.transmitEnrolment = (approvedColor, socketId) => {
            transmitCallback(socketId, { approvedColor });
        };
        this.transmitNameUpdate = (newName: string, socketId: string) => {
            transmitCallback(socketId, { newName });
        };
        this.transmitTurnNotification = (socketId: string) => {
            transmitCallback(socketId, { turnStart: null });
        };
        this.transmitForceTurnNotification = (socketId: string) => {
            transmitCallback(socketId, { forceTurn: null });
        };
        this.transmitRivalControlNotification = (socketId: string) => {
            transmitCallback(socketId, { rivalControl: null });
        };

        if (!savedSession) {
            this.actionProcessor = new EnrolmentProcessor(this.getNewState(), this.transmitEnrolment);
            console.info('New game session created');

            return;
        }

        const { sharedState, privateState, backupState } = savedSession;
        const { gameId, sessionOwner, players, chat } = sharedState;

        this.actionProcessor = (() => {
            switch (sharedState.sessionPhase) {
                case Phase.play:
                    return new PlayProcessor(
                        {
                            playState: new PlayStateHandler(SERVER_NAME, sharedState),
                            privateState: new PrivateStateHandler(privateState!),
                            backupState: new BackupStateHandler(SERVER_NAME, backupState),
                        },
                        this.autoBroadcast,
                        this.transmitTurnNotification,
                        this.transmitForceTurnNotification,
                        this.transmitRivalControlNotification,
                        this.transmitVp,
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

    public getCurrentSession(): SavedSession {
        const state = this.actionProcessor.getState();
        const isPlay = state.sessionPhase === Phase.play;
        return {
            sharedState: state,
            backupState: isPlay ? (this.actionProcessor as PlayProcessor).getBackupState() : null,
            privateState: isPlay ? (this.actionProcessor as PlayProcessor).getPrivateState() : null,
        };
    }

    public resetSession() {
        if ('killIdleChecks' in this.actionProcessor) {
            (this.actionProcessor as PlayProcessor).killIdleChecks();
        }

        this.actionProcessor = new EnrolmentProcessor(this.getNewState(), this.transmitEnrolment);
        console.log('Session was reset');
    }

    public processAction(request: ClientRequest): WsDigest {
        const state = this.actionProcessor.getState();
        const { message  }= request;
        const { action, payload } = message;

        if (action === Action.inquire)
            return this.issueNominalResponse({ state });

        if (action === Action.enrol && state.sessionPhase === Phase.enrolment)
            return this.processEnrolmentAction(request);

        const match = this.matchRequestToPlayer(request);

        if (match.err) {
            console.info('Resetting client;',match.message);

            return this.issueNominalResponse({ resetFrom: SERVER_NAME });
        }

        const { player } = match.data;

        if (action === Action.chat) {

            const message = validator.validateChatPayload(payload);

            if(!message)
                return this.issueNominalResponse(lib.errorResponse('Malformed chat message'));

            const commandMatch = message.input.match(/^#\w*(?=\s)/);

            if (commandMatch) {
                // future switch if more commands are added
                const nameMatch = message.input.match(/(?<=#name )\w.*,*/);

                if (nameMatch && nameMatch[0].length > 2) {
                    const newName = nameMatch[0];

                    if (!state.players.some(p => p.name === newName)) {
                        const response = this.actionProcessor.updatePlayerName(player, newName);

                        this.transmitNameUpdate(newName, player.socketId);

                        return this.issueGroupResponse(response);
                    }
                } else {
                    return this.issueNominalResponse(lib.errorResponse(
                        `${commandMatch[0]} parameter must start with a non-space `
                        + 'character and must contain 3 or more characters',
                    ));
                }
            }

            return this.issueGroupResponse(this.actionProcessor.addChat({
                color: player.color,
                name: player.name,
                message: message.input,
            }));
        }

        if (action === Action.declare_reset) {

            const { sessionOwner, sessionPhase } = state;

            if (player.color === sessionOwner || (sessionPhase === Phase.play && state.hasGameEnded)) {
                this.resetSession();

                return this.issueGroupResponse({ resetFrom: player.name });
            }

            return this.issueNominalResponse(
                lib.errorResponse('Only session owner may reset.'),
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
                `Player [${data.playerColor}] is not enrolled`),
            );
        }

        const { message, player } = data;
        const { action } = message;

        const state = processor.getState();

        const enrolUpdate = ((): Probable<StateResponse> => {
            switch (action) {
                // TODO: add new action change_color
                case Action.start_setup: {
                    const { gameId, sessionOwner, players, chat } = state;

                    if (sessionOwner !== player.color)
                        return lib.fail('Only the session owner may continue.');

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

        if (!('specialist' in player)) {
            return this.issueNominalResponse(
                lib.errorResponse('Player entity is missing properties', { action, player }),
            );
        }

        const setupUpdate = ((): Probable<StateResponse> => {
            switch (action) {
                case Action.pick_specialist:
                    return processor.processSpecialistSelection((player as PlayerDraft), payload );
                case Action.start_play: {
                    const bundleResult = processor.processStart(payload);

                    if (bundleResult.err)
                        return lib.fail('Cannot start game!');

                    try {
                        this.actionProcessor = new PlayProcessor(
                            bundleResult.data,
                            this.autoBroadcast,
                            this.transmitTurnNotification,
                            this.transmitForceTurnNotification,
                            this.transmitRivalControlNotification,
                            this.transmitVp,
                        );
                    } catch (error) {
                        return lib.fail(String(error));
                    }

                    const { playState } = bundleResult.data;

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

        const digest: DataDigest = { player: playerHandler, payload };

        if (!playerHandler.isActivePlayer() && ![Action.chat, Action.force_turn].includes(action))
            return this.issueNominalResponse(lib.errorResponse(
                `It is not [${playerHandler.getIdentity().name}]'s turn!`,
            ));

        const actionsWhileFrozen: Array<Action> = [
            Action.drop_item,
            Action.reposition,
            Action.reposition_rival,
            Action.reposition_opponent,
            Action.move_rival,
            Action.end_rival_turn,
            Action.shift_market,
            Action.undo,
        ];

        if (playerHandler.isFrozen() && !actionsWhileFrozen.includes(action)) {
            return this.issueNominalResponse(lib.errorResponse(
                `[${playerHandler.getIdentity().name}] is handling rival and cannot act.`,
            ));
        }

        const playUpdate = ((): Probable<StateResponse> => {
            switch (action) {
                case Action.force_turn:
                    return processor.forceTurn(digest);
                case Action.spend_favor:
                    return processor.spendFavor(digest);
                case Action.move:
                    return processor.move(digest);
                case Action.move_rival:
                    return processor.move(digest, true);
                case Action.reposition:
                    return processor.reposition(digest);
                case Action.reposition_rival:
                    return processor.reposition(digest, true);
                case Action.reposition_opponent:
                    return processor.repositionOpponent(digest);
                case Action.load_good:
                    return processor.loadGood(digest);
                case Action.sell_goods:
                    return processor.sellGoods(digest);
                case Action.donate_goods:
                    return processor.donateGoods(digest);
                case Action.sell_specialty:
                    return processor.sellSpecialty(digest);
                case Action.buy_metal:
                    return processor.buyMetal(digest);
                case Action.donate_metal:
                    return processor.donateMetal(digest);
                case Action.end_turn:
                    return processor.endTurn(digest);
                case Action.end_rival_turn:
                    return processor.endRivalTurn(digest);
                case Action.undo:
                    return processor.undo(digest);
                case Action.shift_market:
                    return processor.endRivalTurn(digest, true);
                case Action.upgrade_cargo:
                    return processor.upgradeCargo(digest);
                case Action.drop_item:
                    return processor.dropItem(digest);
                default:
                    return lib.fail(`Unknown action: ${action}`);
            }
        })();

        if (playUpdate.err)
            return this.issueNominalResponse(lib.errorResponse(playUpdate.message));

        return this.issueGroupResponse(playUpdate.data);
    }

    private issueNominalResponse(message: ServerMessage): WsDigest {
        return { senderOnly: true, message };
    }

    private issueGroupResponse(message: ServerMessage): WsDigest {
        return { senderOnly: false, message };
    }

    private getNewState() {
        const state = JSON.parse(JSON.stringify(serverConstants.DEFAULT_NEW_STATE));
        const gameId = randomUUID();

        return { ...state, gameId };
    }

    private matchRequestToPlayer(request: ClientRequest): Probable<RequestMatch>  {
        const { gameId, socketId, playerColor, playerName, message } = request;

        if (!gameId || !socketId || !playerColor || !playerName)
            return lib.fail('Request data is incomplete');

        const state = this.actionProcessor.getState();

        if (state.gameId != gameId)
            return lib.fail('Game Id does not match in state');

        const player = state.players.find(p => p.color === playerColor);

        if (!player)
            return lib.fail(`Cannot find player [${playerColor}] in state`);

        if (player.name != playerName)
            return lib.fail(`[${playerName}] does not match name [${player.name}] in state`);

        return lib.pass({ player: { ...player, socketId }, message });
    }
}
