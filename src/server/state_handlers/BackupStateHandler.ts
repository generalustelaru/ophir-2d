import { ChatEntry, PlayerColor } from "~/shared_types";
import { BackupState } from "../server_types";
import tools from "../services/ToolService";
import lib, { Probable } from "../action_processors/library";

export class BackupStateHandler {
    private backupState: BackupState | null;
    private serverName: string;

    constructor(serverName: string, initialState: BackupState | null) {
        this.serverName = serverName;
        this.backupState = initialState;
    }

    getState() {
        return this.backupState;
    }

    public saveCopy(bundle: BackupState) {
        this.backupState = bundle;
    }

    public wipeBackup() {
        this.backupState = null;
    }

    public retrieveBackup(): Probable<BackupState> {
        if (this.backupState === null)
            return lib.fail('Backup does not exist!');

        const bundle = tools.getCopy(this.backupState) ;
        this.backupState = null;
        return lib.pass(bundle);
    }

    public addChat(chat: ChatEntry) {
        if (this.backupState)
            this.backupState?.playState.chat.push(chat);
    }

    public addServerMessage(message: string, as: PlayerColor | null = null) {
        this.backupState?.playState.chat.push({ color: as, name: this.serverName, message });
    }

    public updatePlayerName(color: PlayerColor, name: string ) {
        const player = this.backupState?.playState.players.find(p => p.color === color)

        if (player)
            player.name = name;
    }
}