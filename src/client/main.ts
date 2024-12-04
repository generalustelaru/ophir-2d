import { InfoEventPayload, ActionEventPayload, ErrorEventPayload, LocalState } from "./client_types";
import state from "./state";
import { CommunicationService } from "./services/CommService";
import { CanvasService } from "./services/CanvasService";
import { UserInterfaceService } from "./services/UiService";
import sharedConstants from "../shared_constants";
import clientConstants from "./client_constants";
import { SharedState } from "../shared_types";
const { CONNECTION } = sharedConstants;

//@ts-ignore
let stateDebug: SharedState | null = null;

// Initializations
const savedState = sessionStorage.getItem('localState');
state.local = savedState ? JSON.parse(savedState) : clientConstants.DEFAULT_LOCAL_STATE as LocalState;

const commService: CommunicationService = CommunicationService.getInstance([CONNECTION.wsAddress]);
const uiService: UserInterfaceService = UserInterfaceService.getInstance([]);
const canvasService: CanvasService = CanvasService.getInstance([]);

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
        const sharedState = state.received as SharedState;

        if (sharedState.gameStatus === 'reset') {
            sessionStorage.removeItem('localState');
            alert('The game has been reset');

            window.location.reload();
        }

        if (state.local.isBoardDrawn) {
            canvasService.updateElements();
        } else if (sharedState.gameStatus === 'started') {
            uiService.setInfo('You are playing.');
            state.local.isBoardDrawn = true;
            canvasService.drawElements();
        }

        uiService.updateControls();

        // Debugging
        localStorage.setItem('received', JSON.stringify(sharedState));
        localStorage.setItem('client', JSON.stringify(state));

        ['playerRed', 'playerGreen', 'playerPurple', 'playerYellow'].forEach((playerId) => {
            localStorage.removeItem(playerId);
        });

        for (const player of state.received.players) {
            localStorage.setItem(player.id, JSON.stringify(player));
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
