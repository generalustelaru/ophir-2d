import { ErrorResponse, GameStatus, LobbyState, LobbyStateResponse, PlayerColor, PlayerEntry } from "../../../shared_types";

const serverName = String(process.env.SERVER_NAME);

export class EnrolmentService {

    public processEnrol(state: LobbyState, color: PlayerColor | null, name: string | null): LobbyStateResponse | ErrorResponse {

        if (!color)
            return { error: 'Color is missing!' }

        if (this.isColorTaken(state.players, color))
            return { error: 'Color is is already taken' }

        if (this.isNameTaken(state.players, name))
            return { error: 'This name is already taken' }

        const stateUpdate = this.processPlayer(state, color, name);

        if (stateUpdate) {
            state.chat.push({ id: null, name: serverName, message: `${name} has joined the game` });

            return { lobby: state };
        }

        return { error: `Enrollment failed on player ${color}` };
    }

    private isColorTaken(players: PlayerEntry[], color: PlayerColor) {
        return players.some(player => player.id === color);
    }
    private isNameTaken(players: PlayerEntry[], name: string | null): boolean {

        if (!name)
            return false;

        return players.some(player => player.name === name);
    }

    private processPlayer(state: LobbyState, playerColor: PlayerColor, playerName: string | null): LobbyState | null {
        const incompatibleStatuses: Array<GameStatus> = ['full', 'setup', 'ongoing', 'ended'];

        if (incompatibleStatuses.includes(state.gameStatus)) {
            console.log(`${playerColor} cannot enroll`);

            return null;
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

        return state;
    }
}
