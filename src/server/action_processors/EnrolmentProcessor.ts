import {
    ChatEntry, EnrolmentState, MessagePayload, PlayerColor, PlayerEntity, PlayerEntry, ServerMessage, StateBroadcast,
    Unique,
} from '~/shared_types';
import { Configuration, Probable, RequestMatch, ActionProcessor, UserId, UserReference } from '~/server_types';
import { EnrolmentStateHandler } from '../state_handlers/EnrolmentStateHandler';
import { validator } from '../services/validation/ValidatorService';
import serverConstants from '../server_constants';
import lib from './library';

export class EnrolmentProcessor implements Unique<ActionProcessor> {
    private enrolmentState: EnrolmentStateHandler;
    private transmit: (userId: UserId, message: ServerMessage) => void;
    private broadcast: (state: EnrolmentState) => void;
    private isSinglePlayer: boolean;
    private defaultNames: Array<string>;
    private reportColorAssignment: (userId: UserId, color: PlayerColor) => void;

    constructor(
        state: EnrolmentState,
        broadcastCallback: (state: EnrolmentState) => void,
        transmitCallback: (userId: UserId, message: ServerMessage) => void,
        refUpdateCallback: (userId: UserId, color: PlayerColor) => void,
        configuration: Configuration,
    ) {
        this.isSinglePlayer = configuration.SINGLE_PLAYER;
        this.enrolmentState = new EnrolmentStateHandler(configuration.SERVER_NAME, state);
        this.transmit = transmitCallback;
        this.broadcast = broadcastCallback;
        this.reportColorAssignment = refUpdateCallback;
        const takenNames = state.players.map(p => p.name);
        this.defaultNames = serverConstants.DEFAULT_NAMES.filter(n => !takenNames.includes(n));
    }

    public getPlayerVP(_color: PlayerColor) {
        return 0;
    }

    public clearIdleTimeout() {};

    public handleDisconnection(reference: UserReference) {

        if (!reference.color) return;

        this.enrolmentState.setAway(true, reference.color);
        const remaining = this.enrolmentState.getAllPlayers().filter(p => !p.isAway);

        if (remaining.length == 1) this.enrolmentState.setSessionOwner(remaining[0].color);

        this.broadcast(this.enrolmentState.toDto());
    };

    public handleReconnection(reference: UserReference) {

        if (!reference.color) return;

        if (this.enrolmentState.getAllPlayers().every(p => p.isAway)) {
            this.enrolmentState.setSessionOwner(reference.color);
        }

        this.enrolmentState.setAway(false, reference.color);
        this.broadcast(this.enrolmentState.toDto());
    };

    public addChat(entry:ChatEntry): StateBroadcast {
        this.enrolmentState.addChatEntry(entry);

        return { state: this.getState() };
    }

    public updatePlayerName(player: PlayerEntity, newName: string): StateBroadcast {
        this.enrolmentState.addServerMessage(`[${player.name}] is henceforth known as [${newName}]`, player.color);
        this.enrolmentState.updateName(player.color, newName);

        return { state: this.getState() };
    };

    public assignDefaultName() {
        const pick = Math.random() * this.defaultNames.length;
        const name = this.defaultNames.splice(pick, 1);

        return name[0];
    }

    public getState(): EnrolmentState {
        return this.enrolmentState.toDto();
    }

    public processEnrol(
        userId: UserId,
        payload: MessagePayload,
        displayName: string | null,
        isAdopting: boolean,
    ): Probable<StateBroadcast> {

        if (!userId)
            return failEnrol('User ID is missing.');

        const enrolmentPayload = validator.validateColorSelectionPayload(payload);

        if(!enrolmentPayload)
            return failEnrol('Invalid payload');

        const { color } = enrolmentPayload;
        const name = displayName || this.assignDefaultName();
        const players = this.enrolmentState.getAllPlayers();

        if (this.isColorTaken(players, color))
            return failEnrol('Color is is already taken.');

        const result = ((): Probable<true> => {

            if (!this.enrolmentState.isRoomForNewPlayer())
                return lib.fail('The game is full!');

            this.enrolmentState.addPlayer({ color, name: name || color, isAway: false });

            if (this.enrolmentState.getSessionOwner() === null || isAdopting)
                this.enrolmentState.setSessionOwner(color);

            if (this.isSinglePlayer || this.enrolmentState.getAllPlayers().length > 1)
                this.enrolmentState.allowDraft();

            return lib.pass(true);
        })();

        if (result.err)
            return failEnrol(result.message);

        this.reportColorAssignment(userId, color);
        this.transmit(userId, { color, displayName });

        this.enrolmentState.addServerMessage(`${name} has joined the game`, color);

        return lib.pass({ state: this.enrolmentState.toDto() });

        function failEnrol(reason: string): Probable<StateBroadcast> {
            return lib.fail(`Cannot enrol: ${reason}`);
        }
    }

    public processChangeColor(player: PlayerEntry, match: RequestMatch): Probable<StateBroadcast> {
        const change = validator.validateColorSelectionPayload(match.message.payload);

        if (!change)
            return lib.fail('Color change payload is malformed!');

        const { color: newColor } = change;

        if (this.enrolmentState.getAllPlayers().find(p => p.color == newColor))
            return lib.fail('Color is currently taken.');

        if (this.enrolmentState.getSessionOwner() == player.color)
            this.enrolmentState.setSessionOwner(newColor);

        this.enrolmentState.changeColor(player.color, newColor);

        this.reportColorAssignment(match.userId, newColor);
        this.transmit(match.userId, { color: newColor, displayName: match.player.name });

        return lib.pass({ state: this.enrolmentState.toDto() });
    }

    private isColorTaken(players: PlayerEntry[], color: PlayerColor) {
        return players.some(player => player.color === color);
    }
}

