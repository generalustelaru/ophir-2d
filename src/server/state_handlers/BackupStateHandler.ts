import { Coordinates, PlayerColor, PlayState } from "~/shared_types";
import { PrivateState, BackupState } from "../server_types";
import tools from "../services/ToolService";
import lib, { Probable } from "../action_processors/library";


export class BackupStateHandler {
    private backupState: BackupState | null;

    constructor(initialState: BackupState | null) {
        this.backupState = initialState;
    }

    public saveCopy(_bundle: BackupState) {
        console.log('not implemented');
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

    public updateChat() {
        console.log("not implemented");
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