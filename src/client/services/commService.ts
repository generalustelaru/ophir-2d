import { WebsocketClientMessage, Action, ActionDetails, EventPayload } from '../../shared_types';
import { Service, ServiceInterface } from './service';
import state from '../state';
import constants from '../../constants';

export interface CommunicationInterface extends ServiceInterface {
    createConnection: (address: string) => void,
    sendMessage: (action: Action, details?: ActionDetails) => void,
}

const { EVENT } = constants;

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
            this.broadcastEvent(EVENT.error, {text: "The connection encountered an error."});
        }
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error(data.error);
                this.broadcastEvent(EVENT.error, {text: data.error});

                return;
            }

            state.server = data;

            this.broadcastEvent(EVENT.update);
        }
    }

    sendMessage(action: Action, details?: ActionDetails) {

        if (!this.socket.readyState) {
            console.error('The connection is not open');
            this.broadcastEvent(EVENT.error);

            return;
        }

        const message: WebsocketClientMessage = {
            playerId: state.localPlayerId,
            action,
            details,
        };

        this.socket.send(JSON.stringify(message));
    }
}
