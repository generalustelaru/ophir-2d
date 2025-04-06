import { InfoDetail, ErrorDetail, LocalState, EventName } from "./client_types";
import localState from "./state";
import { CommunicationService } from "./services/CommService";
import { CanvasService } from "./services/CanvasService";
import { UserInterface } from "./services/UiService";
import clientConstants from "./client_constants";
import { Action, PlayState, ClientMessage, ResetResponse, EnrolmentState, SetupState } from "../shared_types";

// Initializations
const serverAddress = process.env.SERVER_ADDRESS;
const wsPort = process.env.WS_PORT;

if (!wsPort || !serverAddress)
    throw new Error('Server address and port must be provided in the environment');

const wsAddress = `ws://${serverAddress}:${wsPort}`;

const savedState = sessionStorage.getItem('localState');
const retrieved = savedState
    ? JSON.parse(savedState) as LocalState
    : clientConstants.DEFAULT_LOCAL_STATE as LocalState;
localState.myId = retrieved.myId;
localState.playerColor = retrieved.playerColor;
localState.playerName = retrieved.playerName;
localState.isBoardDrawn = retrieved.isBoardDrawn;


// const UserInterface = new UserInterfaceClass();

//Send player action to server
window.addEventListener(EventName.action, (event: CustomEventInit) => {
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
window.addEventListener(EventName.error, (event: CustomEventInit) => {
    const detail: ErrorDetail = event.detail;
    signalError(detail.message);
});

// Get server data on connection
window.addEventListener(EventName.connected, () => {
    CommunicationService.sendMessage({ action: Action.inquire, payload: null })
});

window.addEventListener('timeout', () => {
    UserInterface.setInfo('Connection timeout');
    UserInterface.disable();
    CanvasService.disable();
    alert('Please refresh the page');
});

window.addEventListener(EventName.close, () => {
    CommunicationService.clearStatusCheck();
    sessionStorage.removeItem('localState');
    UserInterface.disable();
    CanvasService.disable();
    UserInterface.setInfo('Connection closed. Try again later.');
    alert('The connection was closed');
});

window.addEventListener(EventName.identification, (event: CustomEventInit) => {
    const payload = event.detail;
    localState.myId = payload.clientId;
    sessionStorage.setItem('localState', JSON.stringify(localState));
});

window.addEventListener(Action.reset, (event: CustomEventInit) => {
    const response: ResetResponse = event.detail;
    sessionStorage.removeItem('localState');
    alert(`The game has been reset by ${response.resetFrom}`);
    window.location.reload();
});

window.addEventListener(EventName.enrolment_update, (event: CustomEventInit) => {

    if (!event.detail)
        return signalError('State is missing!');

    const enrolmentState = event.detail as EnrolmentState;

    UserInterface.updateAsEnrolment(enrolmentState);

    if (enrolmentState.players.length) {
        localState.gameId = enrolmentState.gameId;
        sessionStorage.setItem('localState', JSON.stringify(localState));
    }

    debug(enrolmentState);
});

// Update client on server state update
window.addEventListener('play_update', (event: CustomEventInit) => {

    if (!event.detail)
        return signalError('State is missing!');

    const playState = event.detail as PlayState;

    UserInterface.updateAsPlay(playState);

    if (playState.hasGameEnded) {
        CommunicationService.clearStatusCheck();
        CanvasService.drawUpdateElements(playState, true);
    } else {
        CommunicationService.setKeepStatusCheck();
        CanvasService.drawUpdateElements(playState);
    }

    debug(playState);
});

window.addEventListener('setup_update', (event: CustomEventInit) => {
    if (!event.detail)
        return signalError('State is missing!');

    const setupState = event.detail as SetupState;

    CanvasService.drawUpdateElements(setupState, true);
});

window.addEventListener('enrolment_update', (event: CustomEventInit) => {
    if (!event.detail)
        return signalError('State is missing!');

    const enrolmentState = event.detail as EnrolmentState;

    UserInterface.updateAsEnrolment(enrolmentState);
});

window.addEventListener(
    'info',
    (event: CustomEventInit) => {
        const payload: InfoDetail = event.detail;
        UserInterface.setInfo(payload.text)
    }
);

// MARK: CONNECTION
CommunicationService.createConnection(wsAddress);

function signalError(message?: string) {
    console.error(message || 'An error occurred');
    alert(message || 'An error occurred');
}

// Debugging
function debug(state: PlayState|EnrolmentState) {
    if ('isStatusResponse' in state && state.isStatusResponse)
        return;

    localStorage.setItem('sessionPhase', state.sessionPhase);
    localStorage.setItem('received', JSON.stringify(state));
    localStorage.setItem('client', JSON.stringify(localState));

    if ('rival' in state)
        localStorage.setItem('rival', JSON.stringify(state.rival));

    ['Red', 'Green', 'Purple', 'Yellow'].forEach((playerColor) => {
        localStorage.removeItem(playerColor);
    });

    for (const player of state.players) {
        localStorage.setItem(player.id, JSON.stringify(player));
    }
}