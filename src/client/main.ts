import { InfoDetail, ErrorDetail, EventType, MessageType, TutorialState } from '~/client_types';
import localState from './state';
import { GameController } from './services/GameController';
import { TutorialController } from './services/TutorialController';
import { CanvasService } from './services/CanvasService';
import { UserInterface } from './services/UiService';
import {
    Action, ClientMessage, ResetResponse, VpTransmission, ColorTransmission, State,
} from '~/shared_types';

const protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:';
const pathSegments = window.location.pathname.split('/');
const requestedGameId = pathSegments[1];
const isTutorial = requestedGameId == 'tutorial';
const uiService = new UserInterface(isTutorial);
const controller = isTutorial ? new TutorialController() : new GameController(protocol);
const gameAdress = `${protocol}//${window.location.host}/game`;

function signalError(message?: string) {
    const errMessage = message || 'An error occurred';
    console.error(errMessage);
    uiService.addInternalPop(MessageType.ERROR, errMessage);
}

function probe(intervalSeconds: number) {
    uiService.setInfo('Trying to reconnect...');
    const milliseconds = intervalSeconds * 1000;

    const probe = setInterval(() => {
        fetch(
            '/probe',
        ).then(
            (res) => {
                if (res.status === 200) {
                    clearInterval(probe);
                    uiService.addInternalPop(MessageType.INFO, 'Connection restored.');
                    controller.initialize(gameAdress, requestedGameId);
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
    const canvas = new CanvasService(isTutorial);

    window.addEventListener('resize', () => {
        canvas.handleResize();
    });

    //Send player action to server
    window.addEventListener(EventType.action, (event: CustomEventInit<ClientMessage>) => {
        const message = event.detail;

        if (!message)
            return signalError('Action message is missing!');

        controller.processMessage(message);
    });

    //Send state change message to server
    window.addEventListener(EventType.start_setup, () => {
        const message: ClientMessage = {
            action: Action.start_setup,
            payload: null,
        };
        controller.processMessage(message);
    });

    window.addEventListener(EventType.start_play, () => {
        const message: ClientMessage = {
            action: Action.start_play,
            payload: canvas.getSetupCoordinates(),
        };
        controller.processMessage(message);
    });

    window.addEventListener(EventType.error, (event: CustomEventInit) => {
        const detail: ErrorDetail = event.detail;
        signalError(detail.message);
    });

    window.addEventListener(EventType.timeout, () => {
        console.warn('Connection timeout');
        uiService.addInternalPop(MessageType.ERROR, 'Connection was lost.');
        uiService.disable();
        canvas.disable();
        probe(5);
    });

    window.addEventListener(EventType.close, () => {
        console.warn('Connection closed');
        uiService.addInternalPop(MessageType.INFO, 'The server has entered maintenance.');
        uiService.disable();
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
            uiService.addInternalPop(
                MessageType.INFO, 'Set a player name by typing #name and then a preferred name.',
            );
        }

        localState.playerColor = event.detail.color;
    });

    window.addEventListener(EventType.state_update, (event: CustomEventInit) => {
        if (!event.detail)
            return signalError('State is missing!');

        const state = event.detail as State;

        uiService.update(state);
        canvas.drawUpdateElements(state);
    });

    window.addEventListener(EventType.tour_update, (event: CustomEventInit) => {
        if (!event.detail)
            return signalError('State is missing!');

        const { index, state, instructions } = event.detail as TutorialState;
        uiService.update(state, true);
        canvas.drawUpdateElements(state);
        canvas.updateInstructions(instructions);

        fetch(`/tutolytics/${index}`, { method: 'POST' });
    });

    window.addEventListener(EventType.start_turn, () => {
        canvas.notifyForTurn();
    });

    window.addEventListener( EventType.failed_roll, (event: CustomEventInit) => {
        canvas.notifyFailedRoll(event.detail);
    });

    window.addEventListener(EventType.force_turn, () => {
        canvas.notifyForForceTurn();
    });

    window.addEventListener(EventType.abandon, () => {
        alert('This session is no longer supported.');
        window.location.href = '/lobby';
    });

    window.addEventListener(EventType.client_switch, () => {
        alert('Control of this session has been switched to a different window.');
        window.location.href = '/lobby';
    });

    window.addEventListener(
        EventType.info,
        (event: CustomEventInit) => {
            const payload: InfoDetail = event.detail;
            uiService.setInfo(payload.text);
        },
    );

    controller.initialize(gameAdress, requestedGameId);
});
