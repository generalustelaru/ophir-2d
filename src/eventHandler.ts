import {
    EventHandlerInterface,
    EventPayload,
    CommunicationInterface,
    MapBoardInterface,
    UiInterface
} from "./types";
import state from "./state";
import { CommunicationService } from "./services/commService.js";
import { MapBoardService } from "./services/mapBoardService.js";
import { UserInterfaceService } from "./services/uiService";
import constants from "./constants.json";
const { EVENT, ACTION, STATUS } = constants;

export class EventHandler implements EventHandlerInterface{

    commService: CommunicationInterface
    mapBoardService: MapBoardInterface
    uiService: UiInterface

    constructor() {
        this.commService = CommunicationService.getInstance();
        this.mapBoardService = MapBoardService.getInstance();
        this.uiService = UserInterfaceService.getInstance();

        //Send player action to server
        window.addEventListener(
            EVENT.action as any,
            (event: EventPayload) => this.commService.sendMessage(
                event.detail.action,
                event.detail.details
            ),
        );

        // TODO: Update UI on error
        window.addEventListener(
            EVENT.error as any,
            (event: EventPayload) => console.error('Something went wrong :('),
);

        // Get server data on connection
        window.addEventListener(
            EVENT.connected as any,
            () => this.commService.sendMessage(ACTION.inquire),
        );

        window.addEventListener(EVENT.update, () => {
            if (state.server.status == STATUS.started) {
                if (state.isBoardDrawn) {
                    this.mapBoardService.updateBoard();
                } else {
                    this.uiService.setInfo('The \'game\' has started');
                    this.mapBoardService.drawBoard();
                    state.isBoardDrawn = true;
                }
            } else {
                this.uiService.updatePreSessionUi();
            }
        });

        window.addEventListener(
            EVENT.info as any,
            (event: EventPayload) => this.uiService.setInfo(event.detail.details)
        );
    }
}
