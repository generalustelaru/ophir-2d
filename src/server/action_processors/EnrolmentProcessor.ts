import {
    ChatEntry, EnrolmentState, MessagePayload, PlayerColor, PlayerEntity, PlayerEntry, ServerMessage, StateResponse, Unique,
} from '~/shared_types';
import { validator } from '../services/validation/ValidatorService';
import lib from './library';
import { EnrolmentStateHandler } from '../state_handlers/EnrolmentStateHandler';
import { Configuration, Probable, SessionProcessor } from '~/server_types';
import serverConstants from '../server_constants';

export class EnrolmentProcessor implements Unique<SessionProcessor> {
    private enrolmentState: EnrolmentStateHandler;
    private transmit: (socketId: string, message: ServerMessage) => void;
    private isSinglePlayer: boolean;
    private defaultNames: Array<string>;

    constructor(
        state: EnrolmentState,
        transmitCallback: (socketId: string, message: ServerMessage) => void,
        configuration: Configuration,
    ) {
        this.isSinglePlayer = configuration.SINGLE_PLAYER;
        this.enrolmentState = new EnrolmentStateHandler(configuration.SERVER_NAME, state);
        this.transmit = transmitCallback;
        this.defaultNames = [...serverConstants.DEFAULT_NAMES];
    }

    public getState(): EnrolmentState {
        return this.enrolmentState.toDto();
    }

    public processEnrol(socketId: string, payload: MessagePayload): Probable<StateResponse> {
        const enrolmentPayload = validator.validateEnrolmentPayload(payload);

        if(!enrolmentPayload)
            return lib.fail('Cannot enrol in session.');

        const { color, name: nameInput } = enrolmentPayload;
        const name = nameInput || this.assignDefaultName();
        const players = this.enrolmentState.getAllPlayers();

        if (!socketId)
            return lib.fail('Cannot enrol in session. socketId is missing.');

        if (this.isColorTaken(players, color))
            return lib.fail('Color is is already taken');

        const result = ((): Probable<true> => {

            if (!this.enrolmentState.isRoomForNewPlayer())
                return lib.fail('The game is full!');

            this.enrolmentState.addPlayer({ socketId, color, name: name || color });

            if (this.enrolmentState.getSessionOwner() === null)
                this.enrolmentState.setSessionOwner(color);

            if (this.isSinglePlayer || this.enrolmentState.getAllPlayers().length > 1)
                this.enrolmentState.allowDraft();

            return lib.pass(true);
        })();

        if (result.err)
            return result;

        this.transmit(socketId, { approvedColor: color, playerName: name });

        this.enrolmentState.addServerMessage(`${name} has joined the game`, color);
        this.enrolmentState.addServerMessage('Type #name &ltyour new name&gt in the chat to set your name.');

        return lib.pass({ state: this.enrolmentState.toDto() });
    }

    public processChangeColor(player: PlayerEntry, payload: MessagePayload): Probable<StateResponse> {
        const change = validator.validateColorChangePayload(payload);

        if (!change)
            return lib.fail('Color change payload is malformed!');

        const { color: newColor } = change;

        if (this.enrolmentState.getAllPlayers().find(p => p.color == newColor))
            return lib.fail('Color is currently taken.');

        if (this.enrolmentState.getSessionOwner() == player.color)
            this.enrolmentState.setSessionOwner(newColor);

        this.enrolmentState.changeColor(player.color, newColor);
        this.transmit(player.socketId, { approvedNewColor: newColor });

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
