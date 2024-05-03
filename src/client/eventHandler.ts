import { InfoEventPayload, ActionEventPayload } from "../shared_types";
import state from "./state";
import { CommunicationService, CommunicationInterface } from "./services/commService";
import { MapBoardService, MapBoardInterface } from "./services/mapBoardService";
import { UserInterfaceService, UiInterface } from "./services/uiService";
import constants from "../constants";
const { EVENT, ACTION, STATUS } = constants;

export class EventHandler {

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
            (event) => {
                const actionEvent: ActionEventPayload = event.detail;
                this.commService.sendMessage(
                    actionEvent.action,
                    actionEvent.details
                )
            },
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
            if (state.server.status == STATUS.started) {
                if (state.isBoardDrawn) {
                    this.mapBoardService.updateBoard();
                } else {
                    this.uiService.setInfo('The game has started');
                    this.mapBoardService.drawBoard();
                    state.isBoardDrawn = true;
                    this.uiService.disableAllElements();
                }
            } else {
                this.uiService.updatePreSessionUi();
            }
        });

        window.addEventListener(
            EVENT.info as any,
            (event) => {
                const infoEvent: InfoEventPayload = event.detail;
                this.uiService.setInfo(infoEvent.text)
            }
        );
    }
}
