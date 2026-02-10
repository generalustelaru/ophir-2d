import {
    WsDigest, DataDigest, GameState, Probable, Configuration, UserReference, RequestMatch, EnrolRequest, UserId,
    AuthenticatedClientRequest, MatchedPlayerRequest, User,
} from '~/server_types';
import {
    ServerMessage, Action, Phase, PlayState, StateResponse, PlayerColor, PlayerEntity, State, Player,
} from '~/shared_types';
import { PlayerHandler } from './state_handlers/PlayerHandler';
import lib from './action_processors/library';
import { PlayProcessor } from './action_processors/PlayProcessor';
import { SetupProcessor } from './action_processors/SetupProcessor';
import { EnrolmentProcessor } from './action_processors/EnrolmentProcessor';
import serverConstants from '~/server_constants';
import { PrivateStateHandler } from './state_handlers/PrivateStateHandler';
import { PlayStateHandler } from './state_handlers/PlayStateHandler';
import { validator } from './services/validation/ValidatorService';
import { BackupStateHandler } from './state_handlers/BackupStateHandler';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { Font } from 'opentype.js';

/**@throws */
export class Game {
    private gameId: string;
    private timeStamp: number;
    private config: Configuration;
    private actionProcessor: EnrolmentProcessor | SetupProcessor | PlayProcessor;
    private broadcast: ((state: PlayState) => void) | null;
    private transmit: ((userId: UserId, message: ServerMessage) => void) | null;
    private saveDisplayName: ((userId: UserId, name: string) => void) | null;
    private userReferences: Array<UserReference> = [];
    private font: Font | null;

    constructor(
        broadcastCallback: (state: PlayState) => void,
        transmitCallback: (userId: UserId, message: ServerMessage) => void,
        nameUpdateCallback: (userId: UserId, name: string) => void,
        configuration: Configuration,
        savedSession: GameState | null,
        font: Font | null,
    ) {

        if (!font)
            throw new Error('Missing fonts!');

        this.config = { ...configuration };
        this.broadcast = broadcastCallback;
        this.transmit = transmitCallback;
        this.saveDisplayName = nameUpdateCallback;
        this.font = font;

        if (!savedSession) {
            this.gameId = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals], length: 2, separator: '-' });
            this.timeStamp = Date.now();
            this.actionProcessor = new EnrolmentProcessor(
                this.getNewState(this.gameId),
                transmitCallback,
                this.updateReferenceColor.bind(this),
                configuration,
            );
            console.info('New game created');

            return;
        }

        const { sharedState, privateState, backupStates, userReferences, timeStamp } = savedSession;
        const { gameId, sessionOwner, players, chat } = sharedState;

        this.timeStamp = timeStamp;
        this.gameId = gameId;
        this.userReferences = userReferences;

        this.actionProcessor = (() => {
            switch (sharedState.sessionPhase) {
                case Phase.play:
                case Phase.conclusion:
                    if (!privateState)
                        throw new Error('Cannot resume play session w/o PrivateState object');

                    return new PlayProcessor(
                        {
                            privateState: new PrivateStateHandler(privateState),
                            playState: new PlayStateHandler(
                                configuration.SERVER_NAME, sharedState,
                            ),
                            backupState: new BackupStateHandler(backupStates),
                        },
                        configuration,
                        broadcastCallback,
                        transmitCallback,
                        this.getActivationId(sharedState.players),
                    );

                case Phase.setup:
                    return new SetupProcessor(
                        { gameId, gameOwner: (sessionOwner as PlayerColor), players, chat },
                        configuration,
                    );

                case Phase.enrolment:
                    return new EnrolmentProcessor(
                        sharedState,
                        transmitCallback,
                        this.updateReferenceColor.bind(this),
                        configuration,
                    );

                default:
                    throw new Error('Cannot determine session phase');
            }
        })();
    }

    public getPlayerRef(userId: UserId) {
        const ref = this.userReferences.find(r => r.id == userId);

        return ref || null;
    }

    public getAllRefs() {
        return this.userReferences;
    }

    public setPlayerRef(user: User) {
        this.userReferences.push({ ...user, color: null });
    }

    private preserveName(userId: UserId, name: string) {
        const ref = this.userReferences.find(r => r.id == userId);

        if (!ref || !this.saveDisplayName)
            return lib.printError('Game was dereferenced!');

        ref.displayName = name;
        this.saveDisplayName(userId, name);
    };

    public getPlayerVP(color: PlayerColor) {
        return this.actionProcessor.getPlayerVP(color);
    }

    public deReference() {
        this.broadcast = null;
        this.transmit = null;
        this.saveDisplayName = null;
        this.userReferences = [];
        this.font = null;
    }

    public getGameId(): string {
        return this.gameId;
    }

    public getSharedState(): State {
        return this.actionProcessor.getState();
    }

    public getGameState(): GameState {
        const state = this.actionProcessor.getState();
        const isPlayState = [Phase.play, Phase.conclusion].includes(state.sessionPhase);
        return {
            timeStamp: this.timeStamp,
            userReferences: this.userReferences,
            sharedState: state,
            backupStates: isPlayState ? (this.actionProcessor as PlayProcessor).getBackupState() : null,
            privateState: isPlayState ? (this.actionProcessor as PlayProcessor).getPrivateState() : null,
        };
    }

    public updateConfig(configuration: Configuration) {
        this.config = { ...configuration };
    }

    public reset() {
        if (!this.transmit) {
            lib.printError('GameSession was dereferenced but not removed.');
            return;
        }

        for (const ref of this.userReferences)
            ref.color = null;

        if ('killIdleChecks' in this.actionProcessor)
            (this.actionProcessor as PlayProcessor).killIdleChecks();

        this.actionProcessor = new EnrolmentProcessor(
            this.getNewState(this.gameId),
            this.transmit,
            this.updateReferenceColor.bind(this),
            this.config,
        );
    }

    public processAction(request: AuthenticatedClientRequest, isAdoption: boolean): WsDigest {
        this.timeStamp = Date.now();
        const emitError = (reason: string) => {
            lib.printError(`Cannot process action: ${reason}`);
            return this.issueNominalResponse({ error: 'Cannot process request' });
        };

        const reference = this.userReferences.find(r => r.id == request.userId);

        if (!reference)
            return emitError('Player reference is missing');

        const state = this.actionProcessor.getState();
        const { message } = request;
        const { action, payload } = message;
        const { id: userId, displayName } = reference;

        if (action === Action.enrol && state.sessionPhase === Phase.enrolment) {
            return this.processEnrolmentAction(
                { message, userId, displayName, player: null },
                isAdoption,
            );
        }

        const matchOperation = this.matchRequestToPlayer(request);

        if (matchOperation.err)
            return emitError(matchOperation.message);

        const matchedRequest = matchOperation.data;
        const { player } = matchedRequest;

        if (action === Action.chat) {
            const message = validator.validateChatPayload(payload);

            if (!message)
                return emitError('Invalid chat message');

            const commandMatch = message.input.match(/^#\w*(?=\s)/);

            if (commandMatch) {
                // future switch if more commands are added
                const nameMatch = message.input.match(/(?<=#name ).*/);

                if (nameMatch) {

                    if (!this.font)
                        return emitError('Fonts are missing!');

                    if (state.sessionPhase == Phase.conclusion)
                        return this.issueNominalResponse({ error: 'Name cannot be updated after the game ended.' });

                    const newName = nameMatch[0];

                    const measurement = lib.validateTextLength(newName, this.font, 28, 424, 212);

                    if (measurement.err)
                        return this.issueNominalResponse({ error: measurement.message });

                    if (this.isNameTaken(state.players, newName))
                        return this.issueNominalResponse({ error: 'This name is already taken' });

                    this.preserveName(userId, newName);
                    const response = this.actionProcessor.updatePlayerName(player, newName);

                    return this.issueGroupResponse(response);
                } else {
                    return this.issueNominalResponse(
                        { error: `${commandMatch[0]} parameter must start with a non-space` },
                    );
                }
            }

            return this.issueGroupResponse(this.actionProcessor.addChat({
                timeStamp: Date.now(),
                color: player.color,
                name: player.name,
                message: message.input,
            }));
        }

        if (action == Action.declare_reset) {
            const { sessionOwner, sessionPhase } = state;

            if (player.color == sessionOwner || (sessionPhase == Phase.conclusion)) {
                this.reset();
                return this.issueGroupResponse({ resetFrom: player.name });
            }

            return emitError('Non-owner cannot reset.');
        }

        switch (state.sessionPhase) {
            case Phase.conclusion:
                return emitError('Actions can no longer be performed.');
            case Phase.play:
                return this.processPlayAction(matchedRequest);
            case Phase.setup:
                return this.processSetupAction(matchedRequest);
            case Phase.enrolment:
                return this.processEnrolmentAction(matchedRequest, false);
            default:
                return emitError('Unknown game phase!');
        }
    }

    // MARK: ENROL
    private updateReferenceColor(userId: UserId, color: PlayerColor) {
        const ref = this.userReferences.find(r => r.id == userId);

        if (!ref) {
            lib.printError('Could not a find reference to update color!!!');
            return;
        }

        ref.color = color;
    };

    private processEnrolmentAction(request: RequestMatch | EnrolRequest, isAdopting: boolean): WsDigest {
        const processor = this.actionProcessor as EnrolmentProcessor;

        const { message, player } = request;
        const { action } = message;

        if (!player) {
            const { userId, message, displayName } = request;

            const enrolment = processor.processEnrol(userId, message.payload, displayName, isAdopting);

            if (enrolment.err) {
                lib.printError(enrolment.message);
                return this.issueNominalResponse({ error: 'Cannot enrol in game.' });
            }

            return this.issueGroupResponse(enrolment.data);
        }

        if (!player) {
            lib.printError('Cannot process action, player not enrolled.');
            return this.issueNominalResponse({ error: 'Cannot process request.' });
        }

        const state = processor.getState();

        const enrolUpdate = ((): Probable<StateResponse> => {
            switch (action) {
                case Action.change_color: {
                    return processor.processChangeColor(player, request);
                }
                case Action.start_setup: {
                    const { gameId, sessionOwner, players, chat } = state;

                    if (sessionOwner !== player.color)
                        return lib.fail('Only the session owner may continue.');

                    if (!sessionOwner || !players.length || !this.config.SINGLE_PLAYER && players.length < 2)
                        return lib.fail('Setup data is incomplete');

                    try {
                        this.actionProcessor = new SetupProcessor(
                            { gameId, gameOwner: sessionOwner, players, chat },
                            this.config,
                        );
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
            return this.issueNominalResponse({ error: 'Cannot process request.' });

        return this.issueGroupResponse(enrolUpdate.data);
    }

    // MARK: SETUP
    private processSetupAction(request: RequestMatch) {
        const processor = this.actionProcessor as SetupProcessor;

        const { message, player } = request;
        const { action, payload } = message;

        if (!('turnToPick' in player)) {
            lib.printError('Player entity is missing properties');
            return this.issueNominalResponse({ error: 'Cannot process request.' });
        }

        const setupUpdate = ((): Probable<StateResponse> => {
            switch (action) {
                case Action.pick_specialist:
                    return processor.processSpecialistSelection((player), payload);
                case Action.start_play: {
                    const bundleResult = processor.processStart(payload);

                    if (bundleResult.err)
                        return lib.fail('Cannot start game!');

                    if (!this.broadcast || !this.transmit) {
                        console.error('GameSession was dereferenced but not removed');
                        return lib.fail('Cannot start game!');
                    }

                    const stateBundle = bundleResult.data;

                    try {
                        this.actionProcessor = new PlayProcessor(
                            stateBundle,
                            this.config,
                            this.broadcast,
                            this.transmit,
                            this.getActivationId(stateBundle.playState.getAllPlayers()),
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

        if (setupUpdate.err) {
            lib.printError(setupUpdate.message);
            return this.issueNominalResponse({ error: 'Cannot process request.' });
        }

        return this.issueGroupResponse(setupUpdate.data);
    }

    // MARK: PLAY
    public processPlayAction(request: RequestMatch): WsDigest {
        const processor = this.actionProcessor as PlayProcessor;

        const { player, message, userId: userId } = request;
        const { action, payload } = message;

        if (!('timeStamp' in player)) {
            lib.printError('Player entity is missing properties');
            return this.issueNominalResponse({ error: 'Cannot process action' });
        }

        const playerHandler = new PlayerHandler(player, userId);
        playerHandler.refreshTimeStamp();

        const digest: DataDigest = { player: playerHandler, payload, refPool: this.userReferences };

        if (!playerHandler.isActivePlayer() && ![Action.chat, Action.force_turn].includes(action)) {
            lib.printError(`It is not [${playerHandler.getIdentity().name}]'s turn!`);
            return this.issueNominalResponse({ error: 'Cannot process action' });
        }

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
            lib.printError(`[${playerHandler.getIdentity().name}] is handling rival and cannot act.`);
            return this.issueNominalResponse({ error: 'Cannot process action' });
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
                case Action.sell_as_chancellor:
                    return processor.sellAsChancellor(digest);
                case Action.sell_as_peddler:
                    return processor.sellAsPeddler(digest);
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

        if (playUpdate.err) {
            lib.printError(playUpdate.message);
            return this.issueNominalResponse({ error: 'Cannot process action' });
        }

        return this.issueGroupResponse(playUpdate.data);
    }

    private issueNominalResponse(message: ServerMessage): WsDigest {
        return { senderOnly: true, message };
    }

    private issueGroupResponse(message: ServerMessage): WsDigest {
        return { senderOnly: false, message };
    }

    private getNewState(gameId: string) {
        const state = JSON.parse(JSON.stringify(serverConstants.DEFAULT_NEW_STATE));

        return { ...state, gameId };
    }

    private matchRequestToPlayer(request: AuthenticatedClientRequest): Probable<MatchedPlayerRequest> {
        const { userId } = request;

        const state = this.actionProcessor.getState();
        const ref = this.userReferences.find(r => r.id == userId);

        if (!ref)
            return lib.fail(`Cannot find reference for id: ${userId}`);

        const player = state.players.find(p => p.color === ref.color);

        if (!player)
            return lib.fail(`Cannot find color [${ref.color}] in state`);

        return lib.pass({ ...request, player });
    }

    private isNameTaken(players: PlayerEntity[], name: string): boolean {
        return players.some(player => player.name == name);
    }

    private getActivationId(players: Array<Player>): UserId | null {
        const activePlayer = players.find(p => p.isActive);

        if (activePlayer)
            return null;

        const firstPlayer = players.find(p => p.turnOrder == 1);
        const ref = this.userReferences.find(r => r.color == firstPlayer?.color);

        return ref?.id || null;
    }
}
