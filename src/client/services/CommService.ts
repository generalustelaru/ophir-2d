import { LaconicRequest, WebsocketClientMessage, WsPayload } from '../../shared_types';
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
            console.info('Connected to the server');
            this.broadcastEvent('connected');
        }
        this.socket.onerror = (error) => {
            console.error(error);
            this.broadcastEvent('error', { error: 'The connection encountered an error' });
        }
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.id) {
                if (state.local.clientId === null) {
                    console.log(`My new ID is ${data.id}`);
                    this.broadcastEvent('identification', { clientID: data.id });
                } else {
                    this.sendMessage({ action: 'rebind_id', details: {referenceId: data.id, myId: state.local.clientId} });
                }
            }

            if (data.error) {
                console.error('<-', data.error);
                this.broadcastEvent('error', { error: data.error });

                return;
            }

            console.debug('<-', data);

            state.received = data;

            this.broadcastEvent('update');
        }
    }

    public sendMessage(payload: WsPayload) {

        if (!this.socket.readyState) {
            console.error('The connection is not open');
            this.broadcastEvent('error');

            return;
        }

        const message: WebsocketClientMessage = {
            gameId: state.local.gameId,
            clientId: state.local.clientId,
            playerColor: state.local.playerColor,
            playerName: state.local.playerName,
            payload
        };

        console.debug('->', message);
        try {
            this.socket.send(JSON.stringify(message));
        } catch (error) {
            console.error(error);
            this.broadcastEvent('error');
        }
    }

    public beginStatusChecks() {
        const request: LaconicRequest = { action: 'get_status', details: null };
        setInterval(() => {
            this.sendMessage(request);
        }, 5000);
    }
}
