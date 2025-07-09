import { ChatEntry, EnrolmentState, Phase, PlayerColor, PlayerEntry } from "../../shared_types";
import { ObjectHandler } from "../server_types";
import { writable, Writable, readable, Readable, arrayWritable, ArrayWritable } from "./library";

export class EnrolmentStateHandler implements ObjectHandler<EnrolmentState> {
    private gameId: Readable<string>;
    private sessionPhase: Readable<Phase.enrolment>;
    private sessionOwner: Writable<PlayerColor | null>;
    private availableSlots: ArrayWritable<PlayerColor>
    private players: ArrayWritable<PlayerEntry>
    private chat: ArrayWritable<ChatEntry>

    constructor(state: EnrolmentState) {
        this.gameId = readable(state.gameId);
        this.sessionPhase = readable(state.sessionPhase);
        this.sessionOwner = writable(state.sessionOwner);
        this.availableSlots = arrayWritable(state.availableSlots);
        this.players = arrayWritable(state.players);
        this.chat = arrayWritable(state.chat);
    }

    public toDto(): EnrolmentState {
        return {
            gameId: this.gameId.get(),
            sessionPhase: this.sessionPhase.get(),
            sessionOwner: this.sessionOwner.get(),
            availableSlots: this.availableSlots.get(),
            players: this.players.get(),
            chat: this.chat.get(),
        }
    }

    public addChatEntry(chat: ChatEntry) {
        this.chat.addOne(chat);
    }

    public getAllPlayers() {
        return this.players.get();
    }

    public addPlayer(entry: PlayerEntry) {
        this.players.addOne(entry);
        this.availableSlots.removeOne(entry.color)
    }

    public getSessionOwner() {
        return this.sessionOwner.get();
    }

    public setSessionOwner(color: PlayerColor) {
        return this.sessionOwner.set(color);
    }

    public isRoomForNewPlayer() {
        return Boolean(this.availableSlots.get().length);
    }
}