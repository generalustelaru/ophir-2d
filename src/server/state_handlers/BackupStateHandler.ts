import { ChatEntry, PlayerColor } from '~/shared_types';
import { BackupState, Probable } from '../server_types';
import tools from '../services/ToolService';
import lib from '../action_processors/library';

export class BackupStateHandler {
    private backupState: Array<BackupState> = [];
    private serverName: string;

    constructor(serverName: string, initialState: BackupState | null) {
        this.serverName = serverName;
        initialState && this.backupState.push(tools.getCopy(initialState));
    }

    getState() {
        return this.backupState;
    }

    public addState(bundle: BackupState) {
        this.backupState.push(tools.getCopy(bundle));
    }

    public wipeBackup() {
        this.backupState = [];
    }

    public retrieveBackup(): Probable<BackupState> {
        const bundle = this.backupState.pop() ;

        if (!bundle)
            return lib.fail('Backup does not exist!');

        return lib.pass(tools.getCopy(bundle));
    }

    public addChat(chat: ChatEntry) {
        const count = this.backupState.length;
        if (count)
            this.backupState[count - 1].playState.chat.push(chat);
    }

    public addServerMessage(message: string, as: PlayerColor | null = null) {
        // this.backupState?.playState.chat.push({ color: as, name: this.serverName, message });
        this.addChat({ color: as, name: this.serverName, message });
    }

    public updatePlayerName(color: PlayerColor, name: string ) {
        const count = this.backupState.length;
        if (count) {
            const stateRef = this.backupState[count - 1].playState;
            const playerRef = stateRef.players.find(p => p.color === color);

            if (playerRef)
                playerRef.name = name;

        }
    }

    public isEmpty() {
        return !Boolean(this.backupState.length);
    }
}