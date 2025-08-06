import {
    ChatEntry,
    EnrolmentState, MessagePayload, PlayerColor, PlayerEntity, PlayerEntry, ServerMessage, StateResponse,
} from "~/shared_types";
import { validator } from "../services/validation/ValidatorService";
import lib, { Probable } from './library';
import { EnrolmentStateHandler } from '../state_handlers/EnrolmentStateHandler';
import { SessionProcessor } from "~/server_types";

const serverName = String(process.env.SERVER_NAME);

export class EnrolmentProcessor implements SessionProcessor {
    enrolmentState: EnrolmentStateHandler;
    transmitEnrolment: (color:PlayerColor, socketId: string) => void;

    constructor(state: EnrolmentState, transmitEnrolment: (color:PlayerColor, socketId: string) => void) {
        this.enrolmentState = new EnrolmentStateHandler(serverName, state);
        this.transmitEnrolment = transmitEnrolment;
    }

    public getState(): EnrolmentState {
        return this.enrolmentState.toDto();
    }

    public processEnrol(socketId: string | null, payload: MessagePayload): Probable<StateResponse> {
        const enrolmentPayload = validator.validateEnrolmentPayload(payload);

        if(!enrolmentPayload)
            return lib.fail('Cannot enrol in session.');

        const { color, name: nameInput } = enrolmentPayload;
        const name = nameInput || color;

        if (!socketId)
            return lib.fail('Cannot enrol in session. socketId is missing.');

        if (this.isColorTaken(this.enrolmentState.getAllPlayers(), color))
            return lib.fail('Color is is already taken')

        if (this.isNameTaken(this.enrolmentState.getAllPlayers(), name))
            return lib.fail('This name is already taken')

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

    private isColorTaken(players: PlayerEntry[], color: PlayerColor) {
        return players.some(player => player.color === color);
    }

    private isNameTaken(players: PlayerEntry[], name: string | null): boolean {

        if (!name)
            return false;

        return players.some(player => player.name === name);
    }

    public addChat(entry:ChatEntry): StateResponse {
        this.enrolmentState.addChatEntry(entry);

        return { state: this.getState() };
    }

    public updatePlayerName(player: PlayerEntity, newName: string): StateResponse {
        this.enrolmentState.addServerMessage(`[${player.name}] is henceforth known as [${newName}]`, player.color);
        this.enrolmentState.updateName(player.color, newName);

        return { state: this.getState() }
    };
}
