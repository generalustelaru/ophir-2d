import { InfoDetail, ErrorDetail, LocalState, EventName } from "./client_types";
import localState from "./state";
import { CommunicationService } from "./services/CommService";
import { CanvasService } from "./services/CanvasService";
import { UserInterface } from "./services/UiService";
import clientConstants from "./client_constants";
import { Action, PlayState, ClientMessage, ResetResponse, EnrolmentState, SetupState, VpTransmission, ClientIdResponse } from "../shared_types";

// Initializations
const serverAddress = process.env.SERVER_ADDRESS;
const wsPort = process.env.WS_PORT;

if (!wsPort || !serverAddress)
    throw new Error('Server address and port must be provided in the environment');

const wsAddress = `ws://${serverAddress}:${wsPort}`;

const savedState = sessionStorage.getItem('localState');
const { gameId, socketId, playerColor, playerName, vp } = savedState
    ? JSON.parse(savedState) as LocalState
    : clientConstants.DEFAULT_LOCAL_STATE as LocalState;

localState.gameId = gameId;
localState.socketId = socketId;
localState.playerColor = playerColor;
localState.playerName = playerName;
localState.vp = vp;

// MARK: LISTENERS
//Send player action to server
window.addEventListener(EventName.action, (event: CustomEventInit) => {
    const message = event.detail as ClientMessage;
    CommunicationService.sendMessage(message);
});

//Send state change message to server
window.addEventListener(EventName.draft, () => {
    const message: ClientMessage = {
        action: Action.start_setup,
        payload: null
    }
    CommunicationService.sendMessage(message);
});
window.addEventListener(EventName.start_action, () => {
    const message: ClientMessage = {
        action: Action.start_play,
        payload: CanvasService.getSetupCoordinates(),
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
    sessionStorage.removeItem('localState');
    UserInterface.disable();
    CanvasService.disable();
    UserInterface.setInfo('Connection closed. Try again later.');
    alert('The connection was closed');
});

window.addEventListener(EventName.identification, (event: CustomEventInit<ClientIdResponse>) => {

    if (!event.detail)
        return signalError('Id response has failed');

    localState.socketId = event.detail.socketId;
    sessionStorage.setItem('localState', JSON.stringify(localState));
});

window.addEventListener(EventName.vp_transmission, (event: CustomEventInit<VpTransmission>) => {
    if (!event.detail || !localState.playerColor)
        return signalError('VP update failed');

    const { vp } = event.detail;
    localState.vp = vp;
    sessionStorage.setItem('localState', JSON.stringify(localState));
    CanvasService.updatePlayerVp(localState.playerColor, vp);
});

window.addEventListener(EventName.reset, (event: CustomEventInit) => {
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

    if (!localState.gameId) {
        localState.gameId = enrolmentState.gameId;
        sessionStorage.setItem('localState', JSON.stringify(localState));
    }

    debug(enrolmentState);
});

window.addEventListener(EventName.setup_update, (event: CustomEventInit) => {
    if (!event.detail)
        return signalError("State is missing!");

    const setupState = event.detail as SetupState;

    UserInterface.updateAsSetup(setupState);

    debug(setupState);
});

// Update client on server state update
window.addEventListener(EventName.play_update, (event: CustomEventInit) => {

    if (!event.detail)
        return signalError('State is missing!');

    const playState = event.detail as PlayState;

    UserInterface.updateAsPlay(playState);

    CanvasService.drawUpdateElements(
        playState,
        playState.hasGameEnded
    );

    if (playerColor)
        CanvasService.updatePlayerVp(playerColor, vp);

    debug(playState);
});

window.addEventListener(EventName.setup_update, (event: CustomEventInit) => {
    if (!event.detail)
        return signalError('State is missing!');

    const setupState = event.detail as SetupState;
    // TODO: an update AsSetup needed to enable specific buttons during setup phase (state).
    CanvasService.drawUpdateElements(setupState, true);
});

window.addEventListener(EventName.enrolment_update, (event: CustomEventInit) => {
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
function debug(state: PlayState|SetupState|EnrolmentState) {
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
        localStorage.setItem(player.color, JSON.stringify(player));
    }
}