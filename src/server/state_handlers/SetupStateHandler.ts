import { PlayerColor, ChatEntry, SetupState, Phase, PlayerDraft, GamePartialSetup, SpecialistName, SelectableSpecialist } from "~/shared_types";
import { ObjectHandler } from "~/server_types";
import { Readable, readable, arrayWritable, ArrayWritable } from "./library";

export class SetupStateHandler implements ObjectHandler<SetupState> {
    private serverName: Readable<string>;
    private gameId: Readable<string>;
    private sessionPhase: Readable<Phase.setup>;
    private sessionOwner: Readable<PlayerColor>;
    private players: ArrayWritable<PlayerDraft>;
    private specialists: ArrayWritable<SelectableSpecialist>;
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

    public updateName(color: PlayerColor, newName: string) {
        this.players.updateOne(color, (player) => {
            player.name === newName;
            return player;
        } )
    }

    public addServerMessage(message: string, as: PlayerColor | null = null) {
        this.chat.addOne({ color: as, name: this.serverName.get(), message });
    }

    public isSpecialistAssignable(name: SpecialistName) {
        const s = this.specialists.getOne(name);
        if (s && s.owner === null)
            return true;
        return false;
    }

    public getSpecialist(name: SpecialistName) {
        return this.specialists.getOne(name);
    }

    public assignSpecialist(player: PlayerDraft, specialistName: SpecialistName) {
        const { color: currentPlayerColor } = player;
        this.specialists.updateOne(specialistName, (s) => {
            if (s)
                s.owner = currentPlayerColor;
            return s;
        })
        this.players.updateOne(currentPlayerColor, (p) => {
            const s = this.specialists.getOne(specialistName);
            if (p && s) {
                p.specialist = s;
                p.turnToPick = false;
            }
            return p;
        });
        const next = this.players.get().find(p => p.turnOrder === player.turnOrder - 1);
        if (next) {
            this.players.updateOne(next.color, (p) => {
                p.turnToPick = true;
                return p;
            });
        }
    }

    public getNextPlayer() {
        return this.players.get().find(p => p.turnToPick) || null;
    }
}