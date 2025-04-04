import {
    ClientIdResponse, ErrorResponse, ClientRequest, ClientMessage, ServerMessage,
    ResetResponse, Action, PlayStateResponse, EnrolmentStateResponse,
} from '../../shared_types';
import { Communicator } from './Communicator';
import localState from '../state';
import { EventName } from '../client_types';

class CommunicationClass extends Communicator {

    private socket: WebSocket | null = null;
    private statusInterval: NodeJS.Timeout | null = null;

    constructor() {
        super();
    }

    public createConnection(url: string) {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.info('Connection established');
            this.createEvent({ type: EventName.connected, detail: null });
        }

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.info('Connection terminated');
                this.createEvent({type: EventName.close, detail: null });
            } else {
                console.info('Connection timeout');
                this.createEvent({ type: EventName.timeout, detail: null });
            }

            this.socket?.close();
            this.socket = null;
        }

        this.socket.onerror = (error) => {
            console.error(error);
            this.createEvent({
                type: EventName.error,
                detail: { message: 'The connection encountered an error' }
            });
        }
        this.socket.onmessage = (event) => {
            const data: ServerMessage = JSON.parse(event.data);
            console.debug('<-', data);

            if (this.isClientIdResponse(data)) {
                if (localState.myId === null) {
                    this.createEvent({
                        type: EventName.identification,
                        detail: { clientId: data.clientId }
                    });
                } else {
                    this.sendMessage({
                        action: Action.waiver_client,
                        payload: { waiveredId: data.clientId, myId: localState.myId },
                    });
                }

                return;
            }

            if (this.isErrorResponse(data)) {
                console.error('<-', data.error);
                this.createEvent({ type: EventName.error, detail:{ message: data.error } });

                return;
            }

            if (this.isResetOrder(data)) {
                this.createEvent({ type: EventName.reset, detail: data });

                return;
            }

            if (this.isPlayStateResponse(data)) {
                this.createEvent({ type: EventName.play_update, detail: data.play });

                return;
            }

            if (this.isEnrolmentStateResponse(data)) {
                this.createEvent({ type: EventName.enrolment_update, detail: data.enrolment });

                return;
            }

            this.createEvent({ type: EventName.error, detail: { message: 'Could not determine message type.' } });
        }
    }

    public sendMessage(payload: ClientMessage) {

        if (!this.socket || !this.socket.readyState) {
            this.socket?.close();
            this.createEvent({
                type: EventName.error,
                detail: { message: 'The connection is not open' }
            });

            return;
        }

        const { gameId, myId: clientId, playerColor, playerName } = localState;
        const message: ClientRequest = { gameId, clientId, playerColor, playerName, message: payload };

        console.debug('->', message);

        this.socket.send(JSON.stringify(message));
    }

    public setKeepStatusCheck() {

        if (this.statusInterval)
            return;

        this.statusInterval = setInterval(() => {
            this.sendMessage({ action: Action.get_status, payload: null });
        }, 5000);
    }

    public clearStatusCheck() {
        if (this.statusInterval) clearInterval(this.statusInterval);
    }

    private isPlayStateResponse(data: ServerMessage): data is PlayStateResponse {
        return 'play' in data;
    }

    private isEnrolmentStateResponse(data: ServerMessage): data is EnrolmentStateResponse {
        return 'enrolment' in data;
    }

    private isClientIdResponse(data: ServerMessage): data is ClientIdResponse {
        return 'clientId' in data;
    }

    private isErrorResponse(data: ServerMessage): data is ErrorResponse {
        return 'error' in data;
    }

    private isResetOrder(data: ServerMessage): data is ResetResponse {
        return 'resetFrom' in data;
    }
}

export const CommunicationService = new CommunicationClass();