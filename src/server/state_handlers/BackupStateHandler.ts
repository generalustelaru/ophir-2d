import { ChatEntry, Coordinates, PlayerColor, PlayState } from "~/shared_types";
import { PrivateState, BackupState } from "../server_types";
import tools from "../services/ToolService";
import lib, { Probable } from "../action_processors/library";


export class BackupStateHandler {
    private backupState: BackupState | null;
    private serverName: string;

    constructor(serverName: string, initialState: BackupState | null) {
        this.serverName = serverName;
        this.backupState = initialState;
    }

    public saveCopy(bundle: BackupState) {
        this.backupState = bundle;
        console.log('state copied')
    }

    public wipeBackup() {
        this.backupState = null;
        console.log('state wiped')
    }

    public retrieveBackup(): Probable<BackupState> {
        if (this.backupState === null)
            return lib.fail('Backup does not exist!');

        const bundle = tools.getCopy(this.backupState) ;
        this.backupState = null;
        console.log('state returned, then wiped')
        return lib.pass(bundle);
    }

    public addChat(chat: ChatEntry) {
        if (this.backupState)
            this.backupState?.playState.chat.push(chat);
    }

    public addServerMessage(message: string, as: PlayerColor | null = null) {
        this.backupState?.playState.chat.push({ color: as, name: this.serverName, message });
    }

    public updateRepositioning(_color: PlayerColor, _coordinates: Coordinates) {
        console.log('not implemented');
    }

    public updatePlayerName(_color: PlayerColor, _name: string ) {
        console.log('not implemented');
    }

    public updatePlayerSocket(_color: PlayerColor, _socketId: string) {
        console.log('not implemented');
    }
}