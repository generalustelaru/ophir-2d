import { ClientRequest, ErrorResponse, GameStatus, LobbyState, LobbyStateResponse, PlayerColor, PlayerEntry } from "../../shared_types";
import { validator } from "../services/validation/ValidatorService";
import lib, { Probable } from './library';

const serverName = String(process.env.SERVER_NAME);

export class EnrolmentProcessor {
    state: LobbyState;
    constructor(lobbyState: LobbyState) {
        this.state = lobbyState;
    }

    public getState(): LobbyState {
        return this.state;
    }

    public processEnrol(color: PlayerColor | null, name: string | null): LobbyStateResponse | ErrorResponse {

        if (!color)
            return { error: 'Color is missing!' }

        if (this.isColorTaken(this.state.players, color))
            return { error: 'Color is is already taken' }

        if (this.isNameTaken(this.state.players, name))
            return { error: 'This name is already taken' }

        const stateUpdate = this.addPlayerEntry(this.state, color, name);

        if (stateUpdate.err) {
            console.log(stateUpdate.message);

            return { error: stateUpdate.message };
        }

        stateUpdate.data.chat.push({ id: null, name: serverName, message: `${name} has joined the game` });

        return { lobby: stateUpdate.data };
    }

    private isColorTaken(players: PlayerEntry[], color: PlayerColor) {
        return players.some(player => player.id === color);
    }
    private isNameTaken(players: PlayerEntry[], name: string | null): boolean {

        if (!name)
            return false;

        return players.some(player => player.name === name);
    }

    public processChat(request: ClientRequest) {
        const { playerColor, playerName, message } = request;
        const chatPayload = validator.validateChatPayload(message.payload);

        if (!chatPayload)
            return lib.validationErrorResponse();

        this.state.chat.push({
            id: playerColor,
            name: playerName || playerColor,
            message: chatPayload.input,
        });

        return { lobby: this.state };
    }

    private addPlayerEntry(state: LobbyState, playerColor: PlayerColor, playerName: string | null): Probable<LobbyState> {
        const incompatibleStatuses: Array<GameStatus> = ['full', 'setup', 'play', 'ended'];

        if (incompatibleStatuses.includes(state.gameStatus)) {
            return lib.fail(`${playerColor} cannot enroll`);
        }

        state.availableSlots = state.availableSlots.filter(slot => slot !== playerColor);

        const newPlayer: PlayerEntry = {
            id: playerColor,
            name: playerName || playerColor,
        }

        state.players.push(newPlayer);

        console.log(`${playerColor} enrolled`);

        if (state.sessionOwner === null) {
            state.gameStatus = 'created';
            state.sessionOwner = playerColor;
            console.log(`${playerColor} is the session owner`);
        }

        if (state.availableSlots.length === 0) {
            state.gameStatus = 'full';
            console.log(`Session is full`);
        }

        return lib.pass(state);
    }
}
