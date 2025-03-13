import {
    ClientIdResponse, ErrorResponse, ClientRequest, ClientMessage, ServerMessage,
    ResetResponse, StateResponse, Action,
} from '../../shared_types';
import { Communicator } from './Communicator';
import state from '../state';

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
            this.broadcastEvent({ type: 'connected', detail: null });
        }

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.info('Connection terminated');
                this.broadcastEvent({type: 'close', detail: null });
            } else {
                console.info('Connection timeout');
                this.broadcastEvent({ type: 'timeout', detail: null });
            }

            this.socket?.close();
            this.socket = null;
        }

        this.socket.onerror = (error) => {
            console.error(error);
            this.broadcastEvent({
                type: 'error',
                detail: { message: 'The connection encountered an error' }
            });
        }
        this.socket.onmessage = (event) => {
            const data: ServerMessage = JSON.parse(event.data);
            console.debug('<-', data);

            if (this.isClientIdResponse(data)) {
                if (state.local.myId === null) {
                    this.broadcastEvent({
                        type: 'identification',
                        detail: { clientId: data.clientId }
                    });
                } else {
                    this.sendMessage({
                        action: Action.rebind_id,
                        payload: { referenceId: data.clientId, myId: state.local.myId }
                    });
                }

                return;
            }

            if (this.isErrorResponse(data)) {
                console.error('<-', data.error);
                this.broadcastEvent({ type:'error', detail:{ message: data.error } });

                return;
            }

            if (this.isResetOrder(data)) {
                this.broadcastEvent({ type: Action.reset, detail: data });

                return;
            }

            if (this.isStateResponse(data)) {
                state.received = data.state;
                this.broadcastEvent({ type: 'update', detail: null });

                return;
            }

            this.broadcastEvent({ type: 'error', detail: { message: 'Could not determine message type.' } });
        }
    }

    public sendMessage(payload: ClientMessage) {

        if (!this.socket || !this.socket.readyState) {
            this.broadcastEvent({
                type: 'error',
                detail: { message: 'The connection is not open' }
            });

            return;
        }

        const { gameId, myId: clientId, playerColor, playerName } = state.local;
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

    private isStateResponse(data: ServerMessage): data is StateResponse {
        return 'state' in data;
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