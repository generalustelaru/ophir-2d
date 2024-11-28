import { InfoEventPayload, ActionEventPayload, ErrorEventPayload } from "./client_types";
import clientState from "./state";
import { CommunicationService } from "./services/CommService";
import { CanvasService } from "./services/CanvasService";
import { UserInterfaceService } from "./services/UiService";
import sharedConstants from "../shared_constants";
import { SharedState } from "../shared_types";
const { CONNECTION } = sharedConstants;

//@ts-ignore
let stateDebug: SharedState|null = null;

// Initializations
const commService: CommunicationService = CommunicationService.getInstance([CONNECTION.wsAddress]);
const canvasService: CanvasService = CanvasService.getInstance([]);
const uiService: UserInterfaceService = UserInterfaceService.getInstance([]);

//Send player action to server
window.addEventListener(
    'action' as any,
    (event) => {
        const payload: ActionEventPayload = event.detail;
        commService.sendMessage(
            payload.action,
            payload.details
        )
    },
);

//Display errors
window.addEventListener(
    'error' as any,
    (event) => {
        const payload: ErrorEventPayload = event.detail;
        console.error(payload.error);
        alert(payload.error);
    },
);

// Get server data on connection
window.addEventListener(
    'connected',
    () => commService.sendMessage('inquire'),
);

// Update client on server state update
window.addEventListener(
    'update',
    () => {
    const sharedState = clientState.received as SharedState;

    if (sharedState.gameStatus === 'started') {

        if (clientState.isBoardDrawn) {
            canvasService.updateElements();
        } else {
            uiService.setInfo('The game has started');
            canvasService.drawElements();
            clientState.isBoardDrawn = true;
        }
        uiService.updateGameControls();
    } else {
        uiService.updateLobbyControls();
    }
    sessionStorage.setItem('state', JSON.stringify(sharedState));

    ['playerRed', 'playerGreen', 'playerPurple', 'playerYellow'].forEach((playerId) => {
        sessionStorage.removeItem(playerId);
    });

    for (const player of clientState.received.players) {
        sessionStorage.setItem(player.id, JSON.stringify(player));
    }

});

window.addEventListener(
    'info' as any,
    (event) => {
        const payload: InfoEventPayload = event.detail;
        uiService.setInfo(payload.text)
    }
);

commService.createConnection();
