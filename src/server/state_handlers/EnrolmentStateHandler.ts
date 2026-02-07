import { ChatEntry, EnrolmentState, Phase, PlayerColor, PlayerEntry, Unique } from '~/shared_types';
import { ObjectHandler } from '~/server_types';
import { writable, Writable, readable, Readable, arrayWritable, ArrayWritable } from './library';

export class EnrolmentStateHandler implements Unique<ObjectHandler<EnrolmentState>> {
    private serverName: Readable<string>;
    private gameId: Readable<string>;
    private sessionPhase: Readable<Phase.enrolment>;
    private sessionOwner: Writable<PlayerColor | null>;
    private mayDraft: Writable<boolean>;
    private players: ArrayWritable<PlayerEntry>;
    private chat: ArrayWritable<ChatEntry>;

    constructor(serverName: string, state: EnrolmentState) {
        this.serverName = readable(serverName);
        this.gameId = readable(state.gameId);
        this.sessionPhase = readable(state.sessionPhase);
        this.sessionOwner = writable(state.sessionOwner);
        this.mayDraft = writable(state.mayDraft);
        this.players = arrayWritable(state.players, 'color');
        this.chat = arrayWritable(state.chat);
    }

    public toDto(): EnrolmentState {
        return {
            gameId: this.gameId.get(),
            sessionPhase: this.sessionPhase.get(),
            sessionOwner: this.sessionOwner.get(),
            mayDraft: this.mayDraft.get(),
            players: this.players.get(),
            chat: this.chat.get(),
        };
    }

    public addChatEntry(chat: ChatEntry) {
        this.chat.addOne(chat);
        this.trimChatList();
    }

    public getAllPlayers() {
        return this.players.get();
    }

    public addPlayer(entry: PlayerEntry) {
        this.players.addOne(entry);
    }

    public getSessionOwner() {
        return this.sessionOwner.get();
    }

    public setSessionOwner(color: PlayerColor) {
        return this.sessionOwner.set(color);
    }

    public allowDraft() {
        this.mayDraft.set(true);
    }

    public isRoomForNewPlayer() {
        return Boolean(this.players.get().length < 4);
    }

    public addServerMessage(message: string, as: PlayerColor | null = null) {
        this.chat.addOne({ timeStamp: Date.now(), color: as, name: this.serverName.get(), message });
        this.trimChatList();
    }

    public updateName(color: PlayerColor, newName: string) {
        const player = this.players.getOne(color);

        if (!player)
            return;

        this.players.updateOne(player.color, (p) => {
            p.name = newName;
            return p;
        });
    }

    public changeColor(currentColor: PlayerColor, newColor: PlayerColor) {
        const player = this.players.getOne(currentColor);

        if (!player)
            return;

        this.players.updateOne(player.color, (p) => {
            p.color = newColor;
            return p;
        });
    }

    private trimChatList() {
        (this.chat.get().length > 10) && this.chat.drawFirst();
    }
}