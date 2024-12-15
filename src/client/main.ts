import { InfoDetail, ErrorDetail, LocalState } from "./client_types";
import state from "./state";
import { CommunicationService } from "./services/CommService";
import { CanvasService } from "./services/CanvasService";
import { UserInterfaceService } from "./services/UiService";
import clientConstants from "./client_constants";
import { SharedState, ClientMessage } from "../shared_types";

//@ts-ignore
let stateDebug: SharedState | null = null;

// Initializations
const serverAddress = process.env.SERVER_ADDRESS;
const wsPort = process.env.WS_PORT;

if (!wsPort) {
    throw new Error('No websocket address provided');
}
const wsAddress = `ws://${serverAddress}:${wsPort}`;
const savedState = sessionStorage.getItem('localState');
state.local = savedState ? JSON.parse(savedState) : clientConstants.DEFAULT_LOCAL_STATE as LocalState;

const commService: CommunicationService = CommunicationService.getInstance([wsAddress]);
const uiService: UserInterfaceService = UserInterfaceService.getInstance([]);
const canvasService: CanvasService = CanvasService.getInstance([]);

//Send player action to server
window.addEventListener(
    'action',
    (event: CustomEventInit) => {
        const message = event.detail as ClientMessage;

        commService.sendMessage(message);
    },
);

//Send start message to server
window.addEventListener(
    'start',
    () => {
        const message: ClientMessage = {
            action: 'start',
            payload: canvasService.getSetupCoordinates()
        }
        commService.sendMessage(message);
    },
);

//Display errors
window.addEventListener(
    'error',
    (event: CustomEventInit) => {
        const detail: ErrorDetail = event.detail;
        console.error(detail.message ?? 'An error occurred');
        alert(detail.message ?? 'An error occurred');
    },
);

// Get server data on connection
window.addEventListener(
    'connected',
    () => {
        commService.sendMessage({ action: 'inquire', payload: null })
    },
);

window.addEventListener(
    'timeout',
    () => {
        alert('Please refresh the page');
        uiService.setInfo('Connection timeout');
        uiService.disable();
        canvasService.disable();
    },
);

window.addEventListener(
    'close',
    () => {
        sessionStorage.removeItem('localState');
        alert('The connection was closed');
        uiService.setInfo('Connection closed');
        uiService.disable();
        canvasService.disable();
    },
);

window.addEventListener(
    'identification',
    (event: CustomEventInit) => {
        const payload = event.detail;
        state.local.myId = payload.clientId;
        sessionStorage.setItem('localState', JSON.stringify(state.local));
    });

// Update client on server state update
window.addEventListener(
    'update',
    () => { // TODO: Refactor this into a switch statement
        const sharedState = state.received as SharedState;

        if (sharedState.gameStatus === 'created') {
            state.local.gameId = sharedState.gameId;
            sessionStorage.setItem('localState', JSON.stringify(state.local));
        }

        if (sharedState.gameStatus === 'reset') {
            sessionStorage.removeItem('localState');
            alert('The game has been reset');

            window.location.reload();
        }

        if (sharedState.gameStatus === 'ended') {
            // The uiService handles its own cleanup
            canvasService.disable();
        }

        if (state.local.isBoardDrawn) {
            canvasService.update();
        } else if (sharedState.gameStatus === 'started') {
            uiService.setInfo('You are playing.');
            state.local.isBoardDrawn = true;
            canvasService.drawElements();
            commService.beginStatusChecks();
        }

        uiService.updateControls();

        // Debugging
        localStorage.setItem('gameStatus', sharedState.gameStatus);
        localStorage.setItem('received', JSON.stringify(sharedState));
        localStorage.setItem('client', JSON.stringify(state));

        ['Red', 'Green', 'Purple', 'Yellow'].forEach((playerColor) => {
            localStorage.removeItem(playerColor);
        });

        for (const player of state.received.players) {
            localStorage.setItem(player.id, JSON.stringify(player));
        }
    });

window.addEventListener(
    'info',
    (event: CustomEventInit) => {
        const payload: InfoDetail = event.detail;
        uiService.setInfo(payload.text)
    }
);

commService.createConnection();
