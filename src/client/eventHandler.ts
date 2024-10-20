import { InfoEventPayload, ActionEventPayload, ErrorEventPayload } from "./client_types";
import state from "./state";
import { CommunicationService, CommunicationInterface } from "./services/commService";
import { MapBoardService, MapBoardInterface } from "./services/mapBoardService";
import { UserInterfaceService, UiInterface } from "./services/uiService";
import sharedConstants from "../shared_constants";
import clientConstants from "./client_constants";
const { ACTION, STATUS } = sharedConstants;
const { EVENT } = clientConstants;

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
                const payload: ActionEventPayload = event.detail;
                this.commService.sendMessage(
                    payload.action,
                    payload.details
                )
            },
        );

        //Display errors
        window.addEventListener(
            EVENT.error as any,
            (event) => {
                const payload: ErrorEventPayload = event.detail;
                console.error(payload.error);
                alert(payload.error);
            },
        );

        // Get server data on connection
        window.addEventListener(
            EVENT.connected,
            () => this.commService.sendMessage(ACTION.inquire),
        );

        // Update client on server state update
        window.addEventListener(EVENT.update, () => {
            if (state.server.gameStatus == STATUS.started) {
                if (state.isBoardDrawn) {
                    this.mapBoardService.updateBoard();
                } else {
                    this.uiService.setInfo('The game has started');
                    this.mapBoardService.drawBoard();
                    state.isBoardDrawn = true;
                }
                this.uiService.updateGameControls();
            } else {
                this.uiService.updateLobbyControls();
            }
        });

        window.addEventListener(
            EVENT.info as any,
            (event) => {
                const payload: InfoEventPayload = event.detail;
                this.uiService.setInfo(payload.text)
            }
        );
    }
}
