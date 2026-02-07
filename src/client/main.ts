import { InfoDetail, ErrorDetail, EventType, SailAttemptArgs, MessageType } from '~/client_types';
import localState from './state';
import { CommunicationService } from './services/CommService';
import { CanvasService } from './services/CanvasService';
import { UserInterface } from './services/UiService';
import {
    Action, ClientMessage, ResetResponse, VpTransmission, ColorTransmission, State, Phase,
} from '~/shared_types';

const protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:';
const comms = new CommunicationService();
const gameAdress = `${protocol}//${window.location.host}/game`;
const pathSegments = window.location.pathname.split('/');
const requestedGameId = pathSegments[1];

function signalError(message?: string) {
    const errMessage = message || 'An error occurred';
    console.error(errMessage);
    UserInterface.addInternalPop(MessageType.ERROR, errMessage);
}

function probe(intervalSeconds: number) {
    UserInterface.setInfo('Trying to reconnect...');
    const milliseconds = intervalSeconds * 1000;

    const probe = setInterval(() => {
        fetch(
            '/probe',
        ).then(
            (res) => {
                if (res.status === 200) {
                    clearInterval(probe);
                    UserInterface.addInternalPop(MessageType.INFO, 'Connection restored.');
                    comms.createConnection(gameAdress, requestedGameId);
                }
            },
        ).catch(
            err => console.log('Failed to reconnect', { err }),
        );
    },
    milliseconds);
}

function resetClient(source: string) {
    alert(`Client reset ordered by ${source}`);
    window.location.reload();
}

document.fonts.ready.then(() => {
    const canvas = new CanvasService();

    window.addEventListener('resize', () => {
        canvas.handleResize();
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
    window.addEventListener(EventType.start_setup, () => {
        const message: ClientMessage = {
            action: Action.start_setup,
            payload: null,
        };
        comms.sendMessage(message);
    });

    window.addEventListener(EventType.start_play, () => {
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
        UserInterface.addInternalPop(MessageType.ERROR, 'Connection was lost.');
        UserInterface.disable();
        canvas.disable();
        probe(5);
    });

    window.addEventListener(EventType.close, () => {
        console.warn('Connection closed');
        UserInterface.addInternalPop(MessageType.INFO, 'The server has entered maintenance.');
        UserInterface.disable();
        canvas.disable();
        probe(30);
    });

    window.addEventListener(EventType.deauthenticate, (): void => {
        alert('Please log back in again :)');
        window.location.href ='/';
    });

    window.addEventListener(EventType.vp_transmission, (event: CustomEventInit<VpTransmission>) => {
        if (!event.detail || !localState.playerColor)
            return signalError('VP update failed');

        const { vp } = event.detail;
        localState.vp = vp;
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

    window.addEventListener( EventType.identification, (event: CustomEventInit<ColorTransmission>) => {
        if (!event.detail)
            return signalError('Missing color!');

        if (!localState.playerColor) {
            UserInterface.addInternalPop(
                MessageType.INFO, 'Set a player name by typing #name and then a preferred name.',
            );
        }

        localState.playerColor = event.detail.color;
    });

    window.addEventListener(EventType.state_update, (event: CustomEventInit) => {
        if (!event.detail)
            return signalError('State is missing!');

        const state = event.detail as State;

        UserInterface.update(state);
        canvas.drawUpdateElements(state, state.sessionPhase == Phase.play && state.hasGameEnded);
    });

    window.addEventListener(EventType.start_turn, () => {
        canvas.notifyForTurn();
    });

    window.addEventListener(EventType.force_turn, () => {
        canvas.notifyForForceTurn();
    });

    window.addEventListener(EventType.abandon, () => {
        alert('This session is no longer supported.');
        window.location.href = '/lobby';
    });

    window.addEventListener(
        EventType.info,
        (event: CustomEventInit) => {
            const payload: InfoDetail = event.detail;
            UserInterface.setInfo(payload.text);
        },
    );

    comms.createConnection(gameAdress, requestedGameId);
});
