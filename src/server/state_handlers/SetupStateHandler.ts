import { PlayerColor, ChatEntry, SetupState, Phase, PlayerBuild, GamePartialSetup } from "../../shared_types";
import { ObjectHandler } from "../server_types";
import { Readable, readable, arrayWritable, ArrayWritable } from "./library";

export class SetupStateHandler implements ObjectHandler<SetupState> {
    private serverName: Readable<string>;
    private gameId: Readable<string>;
    private sessionPhase: Readable<Phase.setup>;
    private sessionOwner: Readable<PlayerColor>;
    private players: Readable<Array<PlayerBuild>>;
    private setup: Readable<GamePartialSetup>;
    private chat: ArrayWritable<ChatEntry>;

    constructor(serverName: string, state: SetupState) {
        this.serverName = readable(serverName);
        this.gameId = readable(state.gameId);
        this.sessionPhase = readable(state.sessionPhase);
        this.sessionOwner = readable(state.sessionOwner);
        this.players = readable(state.players);
        this.setup = readable(state.setup);
        this.chat = arrayWritable(state.chat);
    }

    public toDto(): SetupState {
        return {
            gameId: this.gameId.get(),
            sessionPhase: this.sessionPhase.get(),
            sessionOwner: this.sessionOwner.get(),
            players: this.players.get(),
            setup: this.setup.get(),
            chat: this.chat.getAll(),
        }
    };

    public addChatEntry(chat: ChatEntry) {
        this.chat.add(chat);
    }

    public addServerMessage(message: string) {
        this.chat.add({ id: null, name: this.serverName.get(), message });
    }
}