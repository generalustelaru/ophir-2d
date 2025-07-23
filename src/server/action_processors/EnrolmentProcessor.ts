import {
    EnrolmentState, PlayerColor, PlayerEntry, StateResponse,
} from "~/shared_types";
import { validator } from "../services/validation/ValidatorService";
import lib, { Probable } from './library';
import { EnrolmentStateHandler } from '../state_handlers/EnrolmentStateHandler';

const serverName = String(process.env.SERVER_NAME);

export class EnrolmentProcessor {
    enrolmentState: EnrolmentStateHandler;
    constructor(state: EnrolmentState) {
        this.enrolmentState = new EnrolmentStateHandler(state);
    }

    public getState(): EnrolmentState {
        return this.enrolmentState.toDto();
    }

    public processEnrol(socketId: string | null, color: PlayerColor, name: string): Probable<StateResponse> {

        if (!socketId)
            return lib.fail('Cannot enrol in session. socketId is missing.');

        if (this.isColorTaken(this.enrolmentState.getAllPlayers(), color))
            return lib.fail('Color is is already taken')

        if (this.isNameTaken(this.enrolmentState.getAllPlayers(), name))
            return lib.fail('This name is already taken')

        const result = ((): Probable<true> => {

            if (!this.enrolmentState.isRoomForNewPlayer())
                return lib.fail('The game is full!');

            this.enrolmentState.addPlayer({ socketId, color, name });

            if (this.enrolmentState.getSessionOwner() === null)
                this.enrolmentState.setSessionOwner(color);

            return lib.pass(true);
        })();

        if (result.err)
            return result;

        this.enrolmentState.addChatEntry({ color: color, name: serverName, message: `${name} has joined the game` });

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

    public processChat(player: PlayerEntry, payload: unknown): Probable<StateResponse> {
        if (!player)
            return lib.fail('Visitors cannot use the chat!')

        const chatPayload = validator.validateChatPayload(payload);

        if (!chatPayload)
            return lib.fail(lib.validationErrorMessage());

        const { color, name } = player;

        this.enrolmentState.addChatEntry({ color, name, message: chatPayload.input });

        return lib.pass({ state: this.enrolmentState.toDto() });
    }


}
