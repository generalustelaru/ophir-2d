import { InfoDetail, ErrorDetail, EventType, LocalState, SailAttemptArgs } from '~/client_types';
import localState from './state';
import { CommunicationService } from './services/CommService';
import { CanvasService } from './services/CanvasService';
import { UserInterface } from './services/UiService';
import clientConstants from '~/client_constants';
import {
    Action, PlayState, ClientMessage, ResetResponse, EnrolmentState, SetupState, VpTransmission, ClientIdResponse,
    EnrolmentResponse, NewNameTransmission, ColorChangeResponse, State, Phase,
} from '~/shared_types';

const PERSIST_SESSION = Boolean(process.env.PERSIST_SESSION === 'true');
const CLIENT_DEBUG = Boolean(process.env.CLIENT_DEBUG === 'true');

const serverAddress = process.env.SERVER_ADDRESS;
const wsPort = process.env.WS_PORT;

if (!wsPort || !serverAddress)
    throw new Error('Server address and port must be provided in the environment');

const wsAddress = `ws://${serverAddress}:${wsPort}`;

if (!PERSIST_SESSION)
    localStorage.removeItem('localStateCopy');

const savedState = sessionStorage.getItem('localState');
const persistedState = localStorage.getItem('localStateCopy');
const { gameId, socketId, playerColor, playerName, vp } = ((): LocalState => {
    switch (true) {
        case !!savedState: return JSON.parse(savedState);
        case PERSIST_SESSION && !!persistedState: return JSON.parse(persistedState);
        default: return clientConstants.DEFAULT_LOCAL_STATE;
    }
})();

localState.gameId = gameId;
localState.socketId = socketId;
localState.playerColor = playerColor;
localState.playerName = playerName;
localState.vp = vp;

function signalError(message?: string) {
    console.error(message || 'An error occurred');
    alert(message || 'An error occurred');
}

function probe(intervalSeconds: number) {
    const milliseconds = intervalSeconds * 1000;

    setInterval(() => {
        fetch(
            '/probe',
        ).then(
            (res) => {
                if (res.status === 200) {
                    alert('Connection restored.');
                    window.location.reload();
                }
            },
        ).catch(
            err => console.log('Failed to reconnect', { err }),
        );
    },
    milliseconds);
}

function resetClient(source: string) {
    sessionStorage.clear();

    if (PERSIST_SESSION)
        localStorage.clear();

    alert(`Client reset ordered by ${source}`);
    window.location.reload();
}

// Debugging
function debug(state: PlayState | SetupState | EnrolmentState) {
    if ('isStatusResponse' in state && state.isStatusResponse)
        return;

    ['_Red', '_Green', '_Purple', '_Yellow'].forEach((playerColor) => {
        localStorage.removeItem(playerColor);
    });
    localStorage.removeItem('_sessionPhase');
    localStorage.removeItem('_sharedState');
    localStorage.removeItem('_client');
    localStorage.removeItem('_rival');

    if (!CLIENT_DEBUG)
        return;

    localStorage.setItem('_sessionPhase', state.sessionPhase);
    localStorage.setItem('_sharedState', JSON.stringify(state));
    localStorage.setItem('_client', JSON.stringify(localState));

    if ('rival' in state)
        localStorage.setItem('_rival', JSON.stringify(state.rival));

    for (const player of state.players) {
        localStorage.setItem(`_${player.color}`, JSON.stringify(player));
    }
}

document.fonts.ready.then(() => {
    const canvas = new CanvasService();
    const comms = new CommunicationService();

    window.addEventListener('resize', () => {
        canvas.fitStageIntoParentContainer();
    });

    //Send player action to server
    window.addEventListener(EventType.action, (event: CustomEventInit<ClientMessage>) => {
        const message = event.detail;

        if (!message)
            return signalError('Action message is missing!');

        comms.sendMessage(message);
    });

    window.addEventListener(EventType.sail_attempt, (event: CustomEventInit<SailAttemptArgs>) => {
        const sailAttemptArgs = event.detail;

        if (!sailAttemptArgs)
            return signalError('Sail attempt data is missing!');

        canvas.openSailAttemptModal(sailAttemptArgs);
    });

    //Send state change message to server
    window.addEventListener(EventType.draft, () => {
        const message: ClientMessage = {
            action: Action.start_setup,
            payload: null,
        };
        comms.sendMessage(message);
    });

    window.addEventListener(EventType.start_action, () => {
        const message: ClientMessage = {
            action: Action.start_play,
            payload: canvas.getSetupCoordinates(),
        };
        comms.sendMessage(message);
    });

    window.addEventListener(EventType.error, (event: CustomEventInit) => {
        const detail: ErrorDetail = event.detail;
        signalError(detail.message);
    });

    window.addEventListener(EventType.timeout, () => {
        console.warn('Connection timeout');
        UserInterface.disable();
        canvas.disable();
        UserInterface.setInfo('Trying to reconnect...');
        probe(5);
    });

    window.addEventListener(EventType.close, () => {
        console.warn('Connection closed');
        sessionStorage.removeItem('localState');
        UserInterface.disable();
        canvas.disable();
        UserInterface.setInfo('The server has entered maintenance.');
        probe(5);
    });

    window.addEventListener(EventType.identification, (event: CustomEventInit<ClientIdResponse>) => {

        if (!event.detail)
            return signalError('Id response has failed');

        localState.socketId = event.detail.socketId;
        sessionStorage.setItem('localState', JSON.stringify(localState));
        comms.sendMessage({ action: Action.inquire, payload: null });
    });

    window.addEventListener(EventType.enrolment_approval, (event: CustomEventInit<EnrolmentResponse>) => {
        if (!event.detail)
            return signalError('Player registration has failed');

        const { approvedColor } = event.detail;

        localState.playerColor = approvedColor;
        localState.playerName = approvedColor;
        sessionStorage.setItem('localState', JSON.stringify(localState));

        if (PERSIST_SESSION)
            localStorage.setItem('localStateCopy', JSON.stringify(localState));
    });

    window.addEventListener(EventType.vp_transmission, (event: CustomEventInit<VpTransmission>) => {
        if (!event.detail || !localState.playerColor)
            return signalError('VP update failed');

        const { vp } = event.detail;
        localState.vp = vp;
        sessionStorage.setItem('localState', JSON.stringify(localState));

        if (PERSIST_SESSION)
            localStorage.setItem('localStateCopy', JSON.stringify(localState));
    });

    window.addEventListener(EventType.name_transmission, (event: CustomEventInit<NewNameTransmission>) => {
        if (!event.detail || !localState.playerColor)
            return signalError('Name update failed');

        const { newName } = event.detail;
        localState.playerName = newName;
        sessionStorage.setItem('localState', JSON.stringify(localState));

        if (PERSIST_SESSION)
            localStorage.setItem('localState', JSON.stringify(localState));
    });

    window.addEventListener(EventType.rival_control_transmission, () => {
        if (!localState.playerColor)
            return signalError('Missing local player data');

        canvas.notifyForRivalControl();
    });

    window.addEventListener(EventType.reset, (event: CustomEventInit) => {
        const response: ResetResponse = event.detail;
        resetClient(response.resetFrom);
    });

    window.addEventListener( EventType.new_color_approval, (event: CustomEventInit<ColorChangeResponse>) => {
        if (!event.detail)
            return signalError('Missing color approval');

        localState.playerColor = event.detail.approvedNewColor;
    });

    window.addEventListener(EventType.state_update, (event: CustomEventInit) => {
        if (!event.detail)
            return signalError('State is missing!');

        const state = event.detail as State;

        if (!localState.gameId) {
            localState.gameId = state.gameId;
            sessionStorage.setItem('localState', JSON.stringify(localState));

            if (PERSIST_SESSION)
                localStorage.setItem('localStateCopy', JSON.stringify(localState));
        }

        if (localState.gameId != state.gameId)
            return resetClient('client');

        UserInterface.update(state);
        canvas.drawUpdateElements(state, state.sessionPhase == Phase.play && state.hasGameEnded);

        debug(state);
    });

    window.addEventListener(EventType.start_turn, () => {
        canvas.notifyForTurn();
    });

    window.addEventListener(EventType.force_turn, () => {
        canvas.notifyForForceTurn();
    });

    window.addEventListener(
        EventType.info,
        (event: CustomEventInit) => {
            const payload: InfoDetail = event.detail;
            UserInterface.setInfo(payload.text);
        },
    );

    comms.createConnection(wsAddress);
});
