import { MessageType, EventType, ServerDetail, DetailKey, ClientDetail, InternalDetail } from '~/client_types';
import localState from './state';
import { ServerConnection } from './services/ServerConnection';
import { FauxConnection } from './services/FauxConnection';
import { CanvasService } from './services/CanvasService';
import { UserInterface } from './services/UiService';
import { Action } from '~/shared_types';
import clientConstants from './client_constants';

const { ROLL_SUSPENSE_MS } = clientConstants;

const protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:';
const pathSegments = window.location.pathname.split('/');
const requestedGameId = pathSegments[1];
const isTutorial = requestedGameId == 'tutorial';
const uiService = new UserInterface(isTutorial);
const connection = isTutorial ? new FauxConnection() : new ServerConnection(protocol);
const gameAdress = `${protocol}//${window.location.host}/game`;

let isRollSuspense: boolean = false;
const transmissionQueue: Array<Function> = [];

function releaseUpdate(updateCallback: Function) {

    if (isRollSuspense) {
        setTimeout(() => {
            isRollSuspense = false;
            updateCallback();

            while (transmissionQueue.length) {
                const callback = transmissionQueue.shift();
                callback && callback();
            }
        }, ROLL_SUSPENSE_MS);
    } else {
        updateCallback();
    }
}

function signalError(message?: string) {
    const errMessage = message || 'An error occurred';
    console.error(errMessage);
    uiService.addInternalPop(MessageType.ERROR, errMessage);
}

function probe(intervalSeconds: number) {
    uiService.setInfo('Trying to reconnect...');
    const milliseconds = intervalSeconds * 1000;

    const probe = setInterval(async () => {
        try {
            const response = await fetch( '/probe');

            if (response.status === 200) {
                clearInterval(probe);
                signalInfo('Connection restored.');
                connection.initialize(gameAdress, requestedGameId);
            }

        } catch (error) {
            console.log('Failed to reconnect', { error });
        }
    }, milliseconds);
}

function signalInfo(text: string) {
    uiService.addInternalPop(MessageType.INFO, text);
}

function processServerMessage(detail: ServerDetail, canvas: CanvasService) {
    const { key, message: message } = detail;

    switch (key) {
        case DetailKey.reset_broadcast: return (() => {
            uiService.disable();
            signalInfo(
                `The game has been reset by ${message.resetFrom}. Please refresh the page.`,
            );
        })();

        case DetailKey.state_broadcast: return releaseUpdate(() => {
            uiService.update(message);
            canvas.drawUpdateElements(message);
        });

        case DetailKey.roll_suspense_broadcast: return (() => {
            isRollSuspense = true;
            canvas.notifyRollSuspense(message);
        })();

        case DetailKey.rival_roll_broadcast: return canvas.notifyForRivalRoll(message);

        case DetailKey.player_id_transmission: return (() => {
            localState.playerColor = message.color;
            signalInfo(message.displayName
                ? `Welcome back, ${message.displayName}!`
                : 'Type in a display name by prefacing it with "#name ".',
            );
        })();

        case DetailKey.vp_transmission: return (() => { localState.vp = message.vp; })();

        case DetailKey.start_turn_transmission: return (isRollSuspense
            ? transmissionQueue.push(() => { canvas.notifyForTurn(); })
            : canvas.notifyForTurn()
        );

        case DetailKey.rival_control_transmission: return (isRollSuspense
            ? transmissionQueue.push(() => { canvas.notifyForRivalControl(); })
            : canvas.notifyForRivalControl()
        );

        case DetailKey.force_turn_transmission: return (isRollSuspense
            ? transmissionQueue.push(() => { canvas.notifyForForceTurn(); })
            : canvas.notifyForForceTurn()
        );

        case DetailKey.not_found_transmission: return signalError('This game no longer exists. :(');

        case DetailKey.expired_transmission: return (() => { window.location.href = '/'; })();

        case DetailKey.client_switch_transmission: return (() => {
            alert('Control in this game has been switched to a different window.');
            window.location.href = '/lobby';
        })();

        case DetailKey.ws_timeout: return (() => {
            signalError('The connection has timed out.');
            uiService.disable();
            canvas.disable();
            probe(5);
        })();

        case DetailKey.ws_closed: return (() => {
            signalInfo('The server has entered maintenance.');
            uiService.disable();
            canvas.disable();
            probe(30);
        })();

        default: return;
    }
}

function dispatchClientMessage(detail: ClientDetail, canvas: CanvasService) {
    const { key, message } = detail;

    switch (key) {
        case DetailKey.client_message: return connection.sendToServer(message);

        case DetailKey.start_setup: return connection.sendToServer(
            { action: Action.start_setup, payload: null },
        );

        case DetailKey.start_play: return connection.sendToServer(
            { action: Action.start_play, payload: canvas.getSetupCoordinates() },
        );

        default: break;
    }
}

function processInternalMessage(detail: InternalDetail, canvas: CanvasService) {
    const { key, message } = detail;

    switch (key) {
        case DetailKey.error: return signalError(message);

        case DetailKey.info: return (() => {
            uiService.setInfo(message);
            signalInfo(message);
        })();

        case DetailKey.tour_update: return releaseUpdate(() => {
            const { index, state, instructions } = message;
            uiService.update({ state }, true);
            canvas.drawUpdateElements({ state });
            canvas.updateInstructions(instructions);
            fetch(`/tutolytics/${index}`, { method: 'POST' });
        });

        default: break;
    }
}

document.fonts.ready.then(() => {
    const canvas = new CanvasService(isTutorial);

    window.addEventListener('resize', () => {
        canvas.handleResize();
    });

    // Receive server/network message
    window.addEventListener(EventType.server, (event: CustomEventInit<ServerDetail>) => {

        if (!event.detail) return signalError('Received empty server event!');

        processServerMessage(event.detail, canvas);
    });

    // Send player message to server
    window.addEventListener(EventType.client, (event: CustomEventInit<ClientDetail>) => {

        if (!event.detail) return signalError('Received empty client event!');

        dispatchClientMessage(event.detail, canvas);
    });

    window.addEventListener(EventType.internal, (event: CustomEventInit<InternalDetail>) => {

        if (!event.detail) return signalError('Received empty internal event!');

        processInternalMessage(event.detail, canvas);
    });

    connection.initialize(gameAdress, requestedGameId);
});
