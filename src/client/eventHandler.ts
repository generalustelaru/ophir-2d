import { InfoEventPayload, ActionEventPayload, ErrorEventPayload } from "./client_types";
import state from "./state";
import { CommunicationService, CommunicationInterface } from "./services/CommService";
import { CanvasService, CanvasInterface } from "./services/CanvasService";
import { UserInterfaceService, UiInterface } from "./services/UiService";
import sharedConstants from "../shared_constants";
import clientConstants from "./client_constants";
import { SharedState } from "../shared_types";
const { ACTION, STATUS } = sharedConstants;
const { EVENT } = clientConstants;

export class EventHandler {

    commService: CommunicationInterface
    canvasService: CanvasInterface
    uiService: UiInterface

    constructor() {
        this.commService = CommunicationService.getInstance();
        this.canvasService = CanvasService.getInstance();
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
            const serverState = state.server as SharedState;
            if (serverState.gameStatus == STATUS.started) {
                if (state.isBoardDrawn) {
                    this.canvasService.updateElements();
                } else {
                    this.uiService.setInfo('The game has started');
                    this.canvasService.drawElements();
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
