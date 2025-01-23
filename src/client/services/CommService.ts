import { ClientIdResponse, ErrorResponse, SharedState, ClientRequest, ClientMessage, ServerMessage, ResetResponse } from '../../shared_types';
import { Service } from './Service';
import state from '../state';

export class CommunicationService extends Service {

    socket: WebSocket;
    statusInterval: NodeJS.Timeout | null = null;

    constructor(url: string) {
        super();
        this.socket = new WebSocket(url);
    }

    public createConnection() {
        this.socket.onopen = () => {
            console.info('Connection established');
            this.broadcastEvent({ type: 'connected', detail: null });
        }

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.info('Connection terminated');
                this.broadcastEvent({type: 'close', detail: null });
            }
            else {
                console.info('Connection timeout');
                this.broadcastEvent({ type: 'timeout', detail: null });
            }
            this.socket.close();
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
                        action: 'rebind_id',
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
                this.broadcastEvent({ type: 'reset', detail: data });

                return;
            }

            if (this.isSharedState(data)) {
                state.received = data;
                this.broadcastEvent({ type: 'update', detail: null });

                return;
            }

            this.broadcastEvent({ type: 'error', detail: { message: 'Could not determine message type.' } });
        }
    }

    public sendMessage(payload: ClientMessage) {

        if (!this.socket.readyState) {
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

    public beginStatusChecks() {
        const message: ClientMessage = { action: 'get_status', payload: null };
        this.statusInterval = setInterval(() => {
            this.sendMessage(message);
        }, 5000);
    }

    public endStatusChecks() {
        if (this.statusInterval) clearInterval(this.statusInterval);
    }
    // TODO: Look for a more thorough solution for type-guarding
    private isSharedState(data: ServerMessage): data is SharedState {
        return 'gameStatus' in data;
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
