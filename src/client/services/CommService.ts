import { WebsocketClientMessage, Action, ActionDetails } from '../../shared_types';
import { Service, ServiceInterface } from './Service';
import clientState from '../state';
import clientConstants from '../client_constants';

export interface CommunicationInterface extends ServiceInterface {
    createConnection(): void,
    sendMessage: (action: Action, details?: ActionDetails) => void,
}

const { EVENT } = clientConstants;

export class CommunicationService extends Service implements CommunicationInterface {

    socket: WebSocket;

    constructor(url: string) {
        super();
        this.socket = new WebSocket(url);
    }

    public createConnection() {
        this.socket.onopen = () => {
            console.info('Connected to the server');
            this.broadcastEvent(EVENT.connected);
        }
        this.socket.onerror = (error) => {
            console.error(error);
            this.broadcastEvent(EVENT.error, { error: 'The connection encountered an error' });
        }
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error('<-', data.error);
                this.broadcastEvent(EVENT.error, { error: data.error });

                return;
            }

            console.debug('<-', data);

            clientState.sharedState = data;

            this.broadcastEvent(EVENT.update);
        }
    }

    public sendMessage(action: Action, details: ActionDetails|null = null) {

        if (!this.socket.readyState) {
            console.error('The connection is not open');
            this.broadcastEvent(EVENT.error);

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
