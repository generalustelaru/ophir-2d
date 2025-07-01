import {
    ClientRequest, ErrorResponse, EnrolmentState, PlayerColor, PlayerEntry, GameStateResponse,
} from "../../shared_types";
import { validator } from "../services/validation/ValidatorService";
import lib, { Probable } from './library';

const serverName = String(process.env.SERVER_NAME);

export class EnrolmentProcessor {
    state: EnrolmentState;
    constructor(lobbyState: EnrolmentState) {
        this.state = lobbyState;
    }

    public getState(): EnrolmentState {
        return this.state;
    }

    public processEnrol(color: PlayerColor | null, name: string | null): GameStateResponse | ErrorResponse {

        if (!color)
            return { error: 'Cannot enrol: Missing player color' }

        if (this.isColorTaken(this.state.players, color))
            return { error: 'Color is is already taken' }

        if (this.isNameTaken(this.state.players, name))
            return { error: 'This name is already taken' }

        const stateUpdate = this.addPlayerEntry(this.state, color, name);

        if (stateUpdate.err) {
            console.log(stateUpdate.message);

            return { error: stateUpdate.message };
        }

        stateUpdate.data.chat.push({ id: color, name: serverName, message: `${name||color} has joined the game` });

        return { state: stateUpdate.data };
    }

    private isColorTaken(players: PlayerEntry[], color: PlayerColor) {
        return players.some(player => player.id === color);
    }
    private isNameTaken(players: PlayerEntry[], name: string | null): boolean {

        if (!name)
            return false;

        return players.some(player => player.name === name);
    }

    public processChat(request: ClientRequest): ErrorResponse | GameStateResponse {
        const { playerColor, playerName, message } = request;
        const chatPayload = validator.validateChatPayload(message.payload);

        if (!chatPayload)
            return lib.validationErrorResponse();

        this.state.chat.push({
            id: playerColor,
            name: playerName || playerColor,
            message: chatPayload.input,
        });

        return { state: this.state };
    }

    private addPlayerEntry(state: EnrolmentState, playerColor: PlayerColor, playerName: string | null): Probable<EnrolmentState> {
        state.availableSlots = state.availableSlots.filter(slot => slot !== playerColor);

        const newPlayer: PlayerEntry = {
            id: playerColor,
            name: playerName || playerColor,
        }

        state.players.push(newPlayer);

        console.log(`${playerColor} enrolled`);

        if (state.sessionOwner === null) {
            state.sessionOwner = playerColor;
            console.log(`${playerColor} is the session owner`);
        }

        if (state.availableSlots.length === 0) {
            console.log(`Session is full`);
        }

        return lib.pass(state);
    }
}
