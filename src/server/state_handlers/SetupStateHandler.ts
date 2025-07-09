import { PlayerColor, ChatEntry, SetupState, Phase, PlayerDraft, GamePartialSetup, Specialist, SpecialistName } from "../../shared_types";
import { ObjectHandler } from "../server_types";
import { Readable, readable, arrayWritable, ArrayWritable } from "./library";

export class SetupStateHandler implements ObjectHandler<SetupState> {
    private serverName: Readable<string>;
    private gameId: Readable<string>;
    private sessionPhase: Readable<Phase.setup>;
    private sessionOwner: Readable<PlayerColor>;
    private players: ArrayWritable<PlayerDraft>;
    private specialists: ArrayWritable<Specialist>;
    private setup: Readable<GamePartialSetup>;
    private chat: ArrayWritable<ChatEntry>;

    constructor(serverName: string, state: SetupState) {
        this.serverName = readable(serverName);
        this.gameId = readable(state.gameId);
        this.sessionPhase = readable(state.sessionPhase);
        this.sessionOwner = readable(state.sessionOwner);
        this.players = arrayWritable(state.players, 'color');
        this.specialists = arrayWritable(state.specialists, 'name');
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
            chat: this.chat.get(),
        }
    };

    public addChatEntry(chat: ChatEntry) {
        this.chat.addOne(chat);
    }

    public addServerMessage(message: string) {
        this.chat.addOne({ color: null, name: this.serverName.get(), message });
    }

    public isSpecialistAssignable(name: SpecialistName) {
        const s = this.specialists.getOne(name);
        if (s && s.owner === null)
            return true;
        return false;
    }

    public assignSpecialist(playerColor: PlayerColor, specialistName: SpecialistName) {
        this.specialists.updateOne(specialistName, (s) => {
            if (s)
                s.owner = playerColor;
            return s;
        })
        this.players.updateOne(playerColor, (p) => {
            const s = this.specialists.getOne(specialistName);
            if (p && s)
                p.specialist = s;
            return p;
        });
    }
}