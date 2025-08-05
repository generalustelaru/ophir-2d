import { InfoDetail, ErrorDetail, EventType, LocalState } from "~/client_types";
import localState from "./state";
import { CommunicationService } from "./services/CommService";
import { CanvasService } from "./services/CanvasService";
import { UserInterface } from "./services/UiService";
import clientConstants from "~/client_constants";
import {
    Action, PlayState, ClientMessage, ResetResponse, EnrolmentState, SetupState, VpTransmission, ClientIdResponse,
    EnrolmentResponse,
} from "~/shared_types";
const PERSIST_SESSION = Boolean(Number(process.env.PERSIST_SESSION));

// MARK: INIT
const serverAddress = process.env.SERVER_ADDRESS;
const wsPort = process.env.WS_PORT;

if (!wsPort || !serverAddress)
    throw new Error('Server address and port must be provided in the environment');

const wsAddress = `ws://${serverAddress}:${wsPort}`;

if (!PERSIST_SESSION)
    localStorage.removeItem('persistedState');

const savedState = sessionStorage.getItem('localState');
const persistedState = localStorage.getItem('persistedState');
const { gameId, socketId, playerColor, playerName, vp } = ((): LocalState => {
    switch (true) {
        case !!savedState: return JSON.parse(savedState);
        case PERSIST_SESSION && !!persistedState: return JSON.parse(persistedState)
        default: return clientConstants.DEFAULT_LOCAL_STATE;
    }
})();

localState.gameId = gameId;
localState.socketId = socketId;
localState.playerColor = playerColor;
localState.playerName = playerName;
localState.vp = vp;

// MARK: LISTENERS
window.addEventListener('resize', () => {
    console.log('Caught resize event!!')
    CanvasService.fitStageIntoParentContainer();
});

//Send player action to server
window.addEventListener(EventType.action, (event: CustomEventInit) => {
    const message = event.detail as ClientMessage;
    CommunicationService.sendMessage(message);
});

//Send state change message to server
window.addEventListener(EventType.draft, () => {
    const message: ClientMessage = {
        action: Action.start_setup,
        payload: null
    }
    CommunicationService.sendMessage(message);
});
window.addEventListener(EventType.start_action, () => {
    const message: ClientMessage = {
        action: Action.start_play,
        payload: CanvasService.getSetupCoordinates(),
    }
    CommunicationService.sendMessage(message);
});

//Display errors
window.addEventListener(EventType.error, (event: CustomEventInit) => {
    const detail: ErrorDetail = event.detail;
    signalError(detail.message);
});

// Get server data on connection
window.addEventListener(EventType.connected, () => {
    CommunicationService.sendMessage({ action: Action.inquire, payload: null })
});

window.addEventListener(EventType.timeout, () => {
    console.warn('Connection timeout');
    UserInterface.disable();
    CanvasService.disable();
    UserInterface.setInfo('The server is off or restarting.');
    alert('The page will refresh');
    window.location.reload();
});

window.addEventListener(EventType.close, () => {
    console.warn('Connection closed');
    sessionStorage.removeItem('localState');
    UserInterface.disable();
    CanvasService.disable();
    UserInterface.setInfo('The server is off or restarting.');
    alert('The page will refresh');
    window.location.reload();
});

window.addEventListener(EventType.identification, (event: CustomEventInit<ClientIdResponse>) => {

    if (!event.detail)
        return signalError('Id response has failed');

    localState.socketId = event.detail.socketId;
    sessionStorage.setItem('localState', JSON.stringify(localState));
});

window.addEventListener(EventType.enrolment_approval, (event: CustomEventInit<EnrolmentResponse>) => {
    if (!event.detail)
        return signalError('Player registration has failed')

    const { approvedColor } = event.detail;

    localState.playerColor = approvedColor;
    localState.playerName = approvedColor;
    sessionStorage.setItem('localState', JSON.stringify(localState));

    if (PERSIST_SESSION)
        localStorage.setItem('persistedState', JSON.stringify(localState));
});

window.addEventListener(EventType.vp_transmission, (event: CustomEventInit<VpTransmission>) => {
    if (!event.detail || !localState.playerColor)
        return signalError('VP update failed');

    const { vp } = event.detail;
    localState.vp = vp;
    sessionStorage.setItem('localState', JSON.stringify(localState));

    if (PERSIST_SESSION)
        localStorage.setItem('persistedState', JSON.stringify(localState));
});

window.addEventListener(EventType.reset, (event: CustomEventInit) => {
    const response: ResetResponse = event.detail;
    sessionStorage.clear();

    if (PERSIST_SESSION)
        localStorage.clear();

    alert(`The game has been reset by ${response.resetFrom}`);
    window.location.reload();
});

// MARK: State
window.addEventListener(EventType.enrolment_update, (event: CustomEventInit) => {
    if (!event.detail)
        return signalError('State is missing!');

    const enrolmentState = event.detail as EnrolmentState;

    UserInterface.updateAsEnrolment(enrolmentState);
    CanvasService.drawUpdateElements(enrolmentState, true);

    if (!localState.gameId) {
        localState.gameId = enrolmentState.gameId;
        sessionStorage.setItem('localState', JSON.stringify(localState));

        if (PERSIST_SESSION)
            localStorage.setItem('persistedState', JSON.stringify(localState));
    }

    debug(enrolmentState);
});

window.addEventListener(EventType.setup_update, (event: CustomEventInit) => {
    if (!event.detail)
        return signalError('State is missing!');

    const setupState = event.detail as SetupState;
    UserInterface.updateAsSetup(setupState);
    CanvasService.drawUpdateElements(setupState, true);

    debug(setupState);
});

window.addEventListener(EventType.play_update, (event: CustomEventInit) => {

    if (!event.detail)
        return signalError('State is missing!');

    const playState = event.detail as PlayState;
    UserInterface.updateAsPlay(playState);
    CanvasService.drawUpdateElements(playState, playState.hasGameEnded);

    debug(playState);
});

window.addEventListener(
    EventType.info,
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