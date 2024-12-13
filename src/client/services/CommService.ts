import { ClientIdResponse, ErrorResponse, LaconicRequest, SharedState, WebsocketClientMessage, WsPayload } from '../../shared_types';
import { Service } from './Service';
import state from '../state';

export class CommunicationService extends Service {

    socket: WebSocket;

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
            const data: SharedState | ClientIdResponse | ErrorResponse = JSON.parse(event.data);

            if ('id' in data) {
                if (state.local.myId === null) {
                    this.broadcastEvent({
                        type: 'identification',
                        detail: { clientId: data.id }
                    });
                } else {
                    this.sendMessage({
                        action: 'rebind_id',
                        payload: { referenceId: data.id, myId: state.local.myId }
                    });
                }

                return;
            }

            if ('error' in data) {
                console.error('<-', data.error);
                this.broadcastEvent({ type:'error', detail:{ message: data.error } });

                return;
            }

            console.debug('<-', data);

            state.received = data;

            this.broadcastEvent({ type: 'update', detail: null });
        }
    }

    public sendMessage(payload: WsPayload) {

        if (!this.socket.readyState) {
            this.broadcastEvent({
                type: 'error',
                detail: { message: 'The connection is not open' }
            });

            return;
        }

        const { gameId, myId: clientId, playerColor, playerName } = state.local;
        const message: WebsocketClientMessage = { gameId, clientId, playerColor, playerName, payload };

        console.debug('->', message);

        this.socket.send(JSON.stringify(message));
    }

    public beginStatusChecks() {
        const request: LaconicRequest = { action: 'get_status', payload: null };
        setInterval(() => {
            this.sendMessage(request);
        }, 5000);
    }
}
