import { WebsocketClientMessage, Action, ActionDetails, PlayerId } from '../../shared_types';
import { Service, ServiceInterface } from './Service';
import state from '../state';
import clientConstants from '../client_constants';

export interface CommunicationInterface extends ServiceInterface {
    createConnection: (address: string) => void,
    sendMessage: (action: Action, details?: ActionDetails) => void,
}

const { EVENT } = clientConstants;

export class CommunicationService extends Service implements CommunicationInterface {

    socket: WebSocket;

    constructor() {
        super();
    }

    createConnection(url: string) {
        this.socket = new WebSocket(url);
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

            state.server = data;

            this.broadcastEvent(EVENT.update);
        }
    }

    sendMessage(action: Action, details: ActionDetails|null = null) {

        if (!this.socket.readyState) {
            console.error('The connection is not open');
            this.broadcastEvent(EVENT.error);

            return;
        }

        const message: WebsocketClientMessage = {
            playerId: state.localPlayerId as PlayerId,
            action,
            details,
        };

        console.debug('->', message);

        this.socket.send(JSON.stringify(message));
    }
}
