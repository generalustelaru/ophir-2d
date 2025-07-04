import {
    ErrorResponse, EnrolmentState, PlayerColor, PlayerEntry, GameStateResponse,
} from "../../shared_types";
import { validator } from "../services/validation/ValidatorService";
import lib, { Probable } from './library';

const serverName = String(process.env.SERVER_NAME);

export class EnrolmentProcessor {
    state: EnrolmentState;
    constructor(state: EnrolmentState) {
        this.state = state;
    }

    public getState(): EnrolmentState {
        return this.state;
    }

    public processEnrol(color: PlayerColor, name: string): GameStateResponse | ErrorResponse {

        if (this.isColorTaken(this.state.players, color))
            return { error: 'Color is is already taken' }

        if (this.isNameTaken(this.state.players, name))
            return { error: 'This name is already taken' }

        const result = this.addPlayerEntry(color, name);

        if (result.err) {
            console.log(result.message);

            return { error: result.message };
        }

        this.state.chat.push({ id: color, name: serverName, message: `${name} has joined the game` });

        return { state: this.state };
    }

    private isColorTaken(players: PlayerEntry[], color: PlayerColor) {
        return players.some(player => player.id === color);
    }
    private isNameTaken(players: PlayerEntry[], name: string | null): boolean {

        if (!name)
            return false;

        return players.some(player => player.name === name);
    }

    public processChat(player: PlayerEntry, payload: unknown) {
        if (!player)
            return lib.issueErrorResponse('Visitors cannot use the chat!')

        const chatPayload = validator.validateChatPayload(payload);

        if (!chatPayload)
            return lib.validationErrorResponse();

        const { id, name } = player;

        this.state.chat.push({
            id,
            name,
            message: chatPayload.input,
        });

        return { state: this.state };
    }

    private addPlayerEntry(playerColor: PlayerColor, playerName: string): Probable<true> {
        this.state.availableSlots = this.state.availableSlots.filter(slot => slot !== playerColor);

        const newPlayer: PlayerEntry = {
            id: playerColor,
            name: playerName,
        }

        this.state.players.push(newPlayer);

        console.log(`${playerColor} enrolled`);

        if (this.state.sessionOwner === null) {
            this.state.sessionOwner = playerColor;
            console.log(`${playerColor} is the session owner`);
        }

        if (this.state.availableSlots.length === 0) {
            console.log(`Session is full`);
        }

        return lib.pass(true);
    }
}
