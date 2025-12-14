import { InfoDetail, ErrorDetail, EventType, SailAttemptArgs, LocalState } from '~/client_types';
import localState from './state';
import { CommunicationService } from './services/CommService';
import { CanvasService } from './services/CanvasService';
import { UserInterface } from './services/UiService';
import {
    Action, ClientMessage, ResetResponse, VpTransmission, ClientIdResponse, EnrolmentResponse, NewNameTransmission,
    ColorChangeResponse, State, Phase,
} from '~/shared_types';

const SERVER_ADDRESS = process.env.SERVER_ADDRESS;
const WS_PORT = process.env.WS_PORT;

if (!WS_PORT || !SERVER_ADDRESS)
    throw new Error('Server address and port must be provided in the environment');

const wsAddress = `ws://${SERVER_ADDRESS}:${WS_PORT}`;

const pathSegments = window.location.pathname.split('/');
const requestedGameId = pathSegments[1];
const savedState: LocalState | null = (() => {
    const str = sessionStorage.getItem('localState');

    if (!str)
        return null;

    const obj = JSON.parse(str);

    if (
        typeof obj == 'object'
        && 'gameId' in obj
        && 'playerColor' in obj
        && 'playerName' in obj
        && 'socketId' in obj
        && 'vp' in obj
    )
        return obj;

    return null;
})();

if (!savedState || savedState.gameId != requestedGameId) {
    localState.gameId = requestedGameId;
    localState.playerColor = null;
    localState.playerName = null;
    localState.socketId = null;
    localState.vp = 0;
} else {
    localState.gameId = savedState.gameId;
    localState.playerColor = savedState.playerColor;
    localState.playerName = savedState.playerName;
    localState.socketId = savedState.socketId;
    localState.vp = savedState.vp;
}

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

    alert(`Client reset ordered by ${source}`);
    window.location.reload();
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

        const { approvedColor, playerName } = event.detail;

        localState.playerColor = approvedColor;
        localState.playerName = playerName;
        sessionStorage.setItem('localState', JSON.stringify(localState));
    });

    window.addEventListener(EventType.vp_transmission, (event: CustomEventInit<VpTransmission>) => {
        if (!event.detail || !localState.playerColor)
            return signalError('VP update failed');

        const { vp } = event.detail;
        localState.vp = vp;
        sessionStorage.setItem('localState', JSON.stringify(localState));
    });

    window.addEventListener(EventType.name_transmission, (event: CustomEventInit<NewNameTransmission>) => {
        if (!event.detail || !localState.playerColor)
            return signalError('Name update failed');

        const { newName } = event.detail;
        localState.playerName = newName;
        sessionStorage.setItem('localState', JSON.stringify(localState));
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
        sessionStorage.setItem('localState', JSON.stringify(localState));
    });

    window.addEventListener(EventType.state_update, (event: CustomEventInit) => {
        if (!event.detail)
            return signalError('State is missing!');

        const state = event.detail as State;

        // TODO: investigate and see if this still makes sense in light of gameID as path
        if (!localState.gameId) {
            localState.gameId = state.gameId;
            sessionStorage.setItem('localState', JSON.stringify(localState));
        }

        if (localState.gameId != state.gameId)
            return resetClient('client');

        UserInterface.update(state);
        canvas.drawUpdateElements(state, state.sessionPhase == Phase.play && state.hasGameEnded);
    });

    window.addEventListener(EventType.start_turn, () => {
        canvas.notifyForTurn();
    });

    window.addEventListener(EventType.force_turn, () => {
        canvas.notifyForForceTurn();
    });

    window.addEventListener(EventType.renew, () => {
        alert('This session is no longer supported.');
        sessionStorage.removeItem('localState');
        window.location.href = '/new';
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
