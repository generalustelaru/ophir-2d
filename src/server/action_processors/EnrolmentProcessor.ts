import {
    ChatEntry, EnrolmentState, MessagePayload, PlayerColor, PlayerEntity, PlayerEntry, StateResponse, Unique,
} from '~/shared_types';
import { validator } from '../services/validation/ValidatorService';
import lib from './library';
import { EnrolmentStateHandler } from '../state_handlers/EnrolmentStateHandler';
import { Probable, SessionProcessor } from '~/server_types';

const serverName = String(process.env.SERVER_NAME);

export class EnrolmentProcessor implements Unique<SessionProcessor> {
    private enrolmentState: EnrolmentStateHandler;
    private transmitEnrolment: (color: PlayerColor, socketId: string) => void;
    private transmitColorChange: (newColor: PlayerColor, socketId: string) => void;

    constructor(
        state: EnrolmentState,
        transmitEnrolment: (color: PlayerColor, socketId: string) => void,
        transmitColorChange: (newColor: PlayerColor, socketId: string) => void,
    ) {
        this.enrolmentState = new EnrolmentStateHandler(serverName, state);
        this.transmitEnrolment = transmitEnrolment;
        this.transmitColorChange = transmitColorChange;
    }

    public getState(): EnrolmentState {
        return this.enrolmentState.toDto();
    }

    public processEnrol(socketId: string, payload: MessagePayload): Probable<StateResponse> {
        const enrolmentPayload = validator.validateEnrolmentPayload(payload);

        if(!enrolmentPayload)
            return lib.fail('Cannot enrol in session.');

        const { color, name: nameInput } = enrolmentPayload;
        const name = nameInput || color;

        if (!socketId)
            return lib.fail('Cannot enrol in session. socketId is missing.');

        if (this.isColorTaken(this.enrolmentState.getAllPlayers(), color))
            return lib.fail('Color is is already taken');


        const result = ((): Probable<true> => {

            if (!this.enrolmentState.isRoomForNewPlayer())
                return lib.fail('The game is full!');

            this.enrolmentState.addPlayer({ socketId, color, name: name || color });

            if (this.enrolmentState.getSessionOwner() === null)
                this.enrolmentState.setSessionOwner(color);

            return lib.pass(true);
        })();

        if (result.err)
            return result;

        this.transmitEnrolment(color, socketId);

        this.enrolmentState.addServerMessage(`${name} has joined the game`, color);
        this.enrolmentState.addServerMessage('Pick/change your name by typing #name &ltyour new name&gt in the chat');

        return lib.pass({ state: this.enrolmentState.toDto() });
    }

    public processChangeColor(player: PlayerEntry, payload: MessagePayload): Probable<StateResponse> {
        const result = validator.validateColorChangePayload(payload);

        if (!result)
            return lib.fail('Color change payload is malformed!');

        if (this.enrolmentState.getAllPlayers().find(p => p.color == result.color))
            return lib.fail('Color is currently taken.');

        if (this.enrolmentState.getSessionOwner() == player.color)
            this.enrolmentState.setSessionOwner(result.color);

        this.enrolmentState.changeColor(player.color, result.color);
        this.transmitColorChange(result.color, player.socketId);

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
}
