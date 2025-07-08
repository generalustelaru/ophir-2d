import { PlayerColor, ChatEntry, SetupState, Phase, PlayerPreBuild, GamePartialSetup, Specialist, SpecialistName } from "../../shared_types";
import { ObjectHandler } from "../server_types";
import { Readable, readable, arrayWritable, ArrayWritable, Writable, writable } from "./library";

export class SetupStateHandler implements ObjectHandler<SetupState> {
    private serverName: Readable<string>;
    private gameId: Readable<string>;
    private sessionPhase: Readable<Phase.setup>;
    private sessionOwner: Readable<PlayerColor>;
    private players: Writable<Array<PlayerPreBuild>>;
    private specialists: Writable<Array<Specialist>>;
    private setup: Readable<GamePartialSetup>;
    private chat: ArrayWritable<ChatEntry>;

    constructor(serverName: string, state: SetupState) {
        this.serverName = readable(serverName);
        this.gameId = readable(state.gameId);
        this.sessionPhase = readable(state.sessionPhase);
        this.sessionOwner = readable(state.sessionOwner);
        this.players = writable(state.players);
        this.specialists = writable(state.specialists);
        this.setup = readable(state.setup);
        this.chat = arrayWritable(state.chat);
    }

    public toDto(): SetupState {
        return {
            gameId: this.gameId.get(),
            sessionPhase: this.sessionPhase.get(),
            sessionOwner: this.sessionOwner.get(),
            players: this.players.get(),
            specialists: this.specialists.get(),
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

    public isSpecialistAssignable(name: SpecialistName) {
        const s = this.specialists.get().find(s => s.name === name);
        if (s && s.owner === null)
            return true;
        return false;
    }

    public assignSpecialist(playerColor: PlayerColor, specialistName: SpecialistName) {
        this.players.update((ps) => {
            const p = ps.find(p => p.id === playerColor);
            const s = this.specialists.get().find(s => s.name === specialistName);
            if (p && s) p.specialist = s;
            return ps;
        });
        this.specialists.update((ss) => {
            const s = ss.find(s => s.name === specialistName);
            if (s) s.owner = playerColor;
            return ss;
        })
    }
}