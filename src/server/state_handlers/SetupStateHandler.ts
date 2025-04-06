import { PlayerColor, PlayerEntry, ChatEntry, SetupState, GameSetup, RivalData, Phase } from "../../shared_types";
import { ObjectHandler } from "../server_types";
import { Readable, readable, arrayWritable, ArrayWritable } from "./library";

export class SetupStateHandler implements ObjectHandler<SetupState> {
    private serverName: Readable<string>;
    private gameId: Readable<string>;
    private sessionPhase: Readable<Phase.setup>;
    private sessionOwner: Readable<PlayerColor>;
    private players: Readable<Array<PlayerEntry>>;
    private setup: Readable<GameSetup>;
    private rival: Readable<RivalData>;
    private chat: ArrayWritable<ChatEntry>;

    constructor(serverName: string, state: SetupState) {
        this.serverName = readable(serverName);
        this.gameId = readable(state.gameId);
        this.sessionPhase = readable(state.sessionPhase);
        this.sessionOwner = readable(state.sessionOwner);
        this.players = readable(state.players);
        this.setup = readable(state.setup);
        this.rival = readable(state.rival);
        this.chat = arrayWritable(state.chat);
    }

    public toDto(): SetupState {
        return {
            gameId: this.gameId.get(),
            sessionPhase: this.sessionPhase.get(),
            sessionOwner: this.sessionOwner.get(),
            players: this.players.get(),
            setup: this.setup.get(),
            rival: this.rival.get(),
            chat: this.chat.getAll(),
        }
    };

    public addServerMessage(message: string) {
        this.chat.add({ id: null, name: this.serverName.get(), message });
    }
}