import { WebsocketClientMessage, Action, ActionDetails } from '../../shared_types';
import { Service } from './Service';
import clientState from '../state';

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

            if (data.error) {
                console.error('<-', data.error);
                this.broadcastEvent('error', { error: data.error });

                return;
            }

            console.debug('<-', data);

            clientState.received = data;

            this.broadcastEvent('update');
        }
    }

    public sendMessage(action: Action, details: ActionDetails|null = null) {

        if (!this.socket.readyState) {
            console.error('The connection is not open');
            this.broadcastEvent('error');

            return;
        }

        const message: WebsocketClientMessage = {
            playerId: clientState.localPlayerId,
            action,
            details
        };

        console.debug('->', message);

        this.socket.send(JSON.stringify(message));
    }
}
