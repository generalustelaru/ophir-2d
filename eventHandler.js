import state from "./state.js";
import { CommunicationService } from "./services/commService.js";
import { MapBoardService } from "./services/mapBoardService.js";
import { UserInterfaceService } from "./services/uiService.js";
import constants from "./constants.json";
const { EVENT, ACTION, STATUS } = constants;

export class EventHandler extends EventTarget{

    constructor() {
        super();
        this.commService = CommunicationService.getInstance();
        this.mapBoardService = MapBoardService.getInstance();
        this.uiService = UserInterfaceService.getInstance();

        //Send player action to server
        window.addEventListener(
            EVENT.action,
            (event) => this.commService.sendMessage(
                event.detail.action,
                event.detail.details
            ),
        );

        // TODO: Update UI on error
        window.addEventListener(
            EVENT.error,
            () => console.error('Something went wrong :('),
        );

        // Get server data on connection
        window.addEventListener(
            EVENT.connected,
            () => this.commService.sendMessage(ACTION.inquire),
        );

        window.addEventListener(EVENT.update, () => {
            if ((state.server.status == STATUS.started && state.playerId) || state.isSpectator) {
                if (state.isBoardDrawn) {
                    this.mapBoardService.updateBoard();
                } else {
                    this.uiService.setInfo('The \'game\' has started');
                    this.mapBoardService.drawBoard();
                    state.isBoardDrawn = true;
                }
            }
            this.uiService.updatePreSessionUi();
        });

        window.addEventListener(
            EVENT.info,
            (event) => this.uiService.setInfo(event.detail.text)
        );
    }
}
