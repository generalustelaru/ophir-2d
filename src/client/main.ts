import { InfoDetail, ErrorDetail, LocalState } from "./client_types";
import state from "./state";
import { CommunicationService } from "./services/CommService";
import { CanvasService } from "./services/CanvasService";
import { UserInterfaceService } from "./services/UiService";
import clientConstants from "./client_constants";
import { Action, SharedState, ClientMessage, ResetResponse } from "../shared_types";

//@ts-ignore
let stateDebug: SharedState | null = null;

// Initializations
const serverAddress = process.env.SERVER_ADDRESS;
const wsPort = process.env.WS_PORT;

if (!wsPort || !serverAddress)
    throw new Error('Server address and port must be provided in the environment');

const wsAddress = `ws://${serverAddress}:${wsPort}`;
const savedState = sessionStorage.getItem('localState');
state.local = savedState ? JSON.parse(savedState) : clientConstants.DEFAULT_LOCAL_STATE as LocalState;

//Send player action to server
window.addEventListener('action', (event: CustomEventInit) => {
    const message = event.detail as ClientMessage;
    CommunicationService.sendMessage(message);
});

//Send start message to server
window.addEventListener(Action.start, () => {
    const message: ClientMessage = {
        action: Action.start,
        payload: CanvasService.getSetupCoordinates()
    }
    CommunicationService.sendMessage(message);
});

//Display errors
window.addEventListener('error', (event: CustomEventInit) => {
    const detail: ErrorDetail = event.detail;
    console.error(detail.message || 'An error occurred');
    alert(detail.message || 'An error occurred');
});

// Get server data on connection
window.addEventListener('connected', () => {
    CommunicationService.sendMessage({ action: Action.inquire, payload: null })
});

window.addEventListener('timeout', () => {
    UserInterfaceService.setInfo('Connection timeout');
    UserInterfaceService.disable();
    CanvasService.disable();
    alert('Please refresh the page');
});

window.addEventListener('close', () => {
    CommunicationService.clearStatusCheck();
    sessionStorage.removeItem('localState');
    UserInterfaceService.disable();
    CanvasService.disable();
    UserInterfaceService.setInfo('Connection closed. Try again later.');
    alert('The connection was closed');
});

window.addEventListener('identification', (event: CustomEventInit) => {
    const payload = event.detail;
    state.local.myId = payload.clientId;
    sessionStorage.setItem('localState', JSON.stringify(state.local));
});

window.addEventListener(Action.reset, (event: CustomEventInit) => {
    const response: ResetResponse = event.detail;
    sessionStorage.removeItem('localState');
    alert(`The game has been reset by ${response.resetFrom}`);
    window.location.reload();
});

// Update client on server state update
window.addEventListener('update', () => {
    const sharedState = state.received as SharedState;

    switch(sharedState.gameStatus) {
        case 'started':
            CommunicationService.setKeepStatusCheck();
            CanvasService.drawUpdateElements();
            UserInterfaceService.setInfo('You are playing.');
            break;

        case 'ended':
            CommunicationService.clearStatusCheck();
            CanvasService.drawUpdateElements(true);
            break;

        case 'created':
            state.local.gameId = sharedState.gameId;
            sessionStorage.setItem('localState', JSON.stringify(state.local));
            break;

        case 'empty':
        case "full":
        default:
            break;
    }

    UserInterfaceService.updateControls();

    // Debugging
    if (sharedState.isStatusResponse)
        return;

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
        UserInterfaceService.setInfo(payload.text)
    }
);

CommunicationService.createConnection(wsAddress);
