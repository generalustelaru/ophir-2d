import {
    ChatEntry, EnrolmentState, MessagePayload, PlayerColor, PlayerEntity, PlayerEntry, ServerMessage, StateResponse,
    Unique,
} from '~/shared_types';
import { Configuration, Probable, RequestMatch, ActionProcessor, UserId } from '~/server_types';
import { EnrolmentStateHandler } from '../state_handlers/EnrolmentStateHandler';
import { validator } from '../services/validation/ValidatorService';
import serverConstants from '../server_constants';
import lib from './library';

export class EnrolmentProcessor implements Unique<ActionProcessor> {
    private enrolmentState: EnrolmentStateHandler;
    private transmit: (userId: UserId, message: ServerMessage) => void;
    private isSinglePlayer: boolean;
    private defaultNames: Array<string>;
    private reportColorAssignment: (userId: UserId, color: PlayerColor) => void;

    constructor(
        state: EnrolmentState,
        transmitCallback: (userId: UserId, message: ServerMessage) => void,
        refUpdateCallback: (userId: UserId, color: PlayerColor) => void,
        configuration: Configuration,
    ) {
        this.isSinglePlayer = configuration.SINGLE_PLAYER;
        this.enrolmentState = new EnrolmentStateHandler(configuration.SERVER_NAME, state);
        this.transmit = transmitCallback;
        this.reportColorAssignment = refUpdateCallback;
        this.defaultNames = [...serverConstants.DEFAULT_NAMES];
    }

    public getPlayerVP(_color: PlayerColor) {
        return 0;
    }

    public getState(): EnrolmentState {
        return this.enrolmentState.toDto();
    }

    public processEnrol(userId: UserId, payload: MessagePayload, displayName: string | null): Probable<StateResponse> {

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

            this.enrolmentState.addPlayer({ color, name: name || color });

            if (this.enrolmentState.getSessionOwner() === null)
                this.enrolmentState.setSessionOwner(color);

            if (this.isSinglePlayer || this.enrolmentState.getAllPlayers().length > 1)
                this.enrolmentState.allowDraft();

            return lib.pass(true);
        })();

        if (result.err)
            return failEnrol(result.message);

        this.reportColorAssignment(userId, color);
        this.transmit(userId, { color });

        this.enrolmentState.addServerMessage(`${name} has joined the game`, color);
        this.enrolmentState.addServerMessage('Set a player name by typing #name and then a preferred name.');

        return lib.pass({ state: this.enrolmentState.toDto() });

        function failEnrol(reason: string): Probable<StateResponse> {
            return lib.fail(`Cannot enrol: ${reason}`);
        }
    }

    public processChangeColor(player: PlayerEntry, match: RequestMatch): Probable<StateResponse> {
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
        this.transmit(match.userId, { color: newColor });

        return lib.pass({ state: this.enrolmentState.toDto() });
    }

    private isColorTaken(players: PlayerEntry[], color: PlayerColor) {
        return players.some(player => player.color === color);
    }

    public addChat(entry:ChatEntry): StateResponse {
        this.enrolmentState.addChatEntry(entry);

        return { state: this.getState() };
    }

    public updatePlayerName(player: PlayerEntity, newName: string): StateResponse {
        this.enrolmentState.addServerMessage(`[${player.name}] is henceforth known as [${newName}]`, player.color);
        this.enrolmentState.updateName(player.color, newName);

        return { state: this.getState() };
    };

    public assignDefaultName() {
        const pick = Math.random() * this.defaultNames.length;
        const name = this.defaultNames.splice(pick, 1);

        return name[0];
    }
}
