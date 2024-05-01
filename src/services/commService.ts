import { Service, ServiceInterface } from './service';
import state from '../state';
import constants from '../constants.json';

export interface CommunicationInterface extends ServiceInterface {
    createConnection: (address: string) => void,
    sendMessage: (action: string, details?: any) => void,
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
            this.broadcastEvent(EVENT.error);
        }
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error(data.error);
                this.broadcastEvent(EVENT.error);

                return;
            }

            state.server = data;
            console.dir(state); // debug
            this.broadcastEvent(EVENT.update);
        }
    }

    sendMessage(action: string, details: string | null) {

        if (!this.socket.readyState) {
            console.error('The connection is not open');
            this.broadcastEvent(EVENT.error);

            return;
        }

        this.socket.send(JSON.stringify({
            playerId: state.playerId,
            action,
            details,
        }));
    }
}
