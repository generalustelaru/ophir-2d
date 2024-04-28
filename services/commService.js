import { Service } from './service.js';
import state from '../state.js';
import constants from '../constants.json';
const { EVENT } = constants;

export class CommunicationService extends Service {

    constructor() {
        super();
    }

    createConnection(url) {
        this.socket = new WebSocket(url);
        this.socket.onopen = () => {
            console.info('Connected to the server');
            dispatchEvent(new CustomEvent(EVENT.connected));
        }
        this.socket.onerror = (error) => {
            console.error(error);
            dispatchEvent(new CustomEvent(EVENT.error));
        }
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error(data.error);
                dispatchEvent(new CustomEvent(EVENT.error));

                return;
            }

            console.dir(data); // debug
            state.server = data;
            dispatchEvent(new CustomEvent(EVENT.update));
        }
    }

    sendMessage(action, details = null) {

        if (!this.socket.readyState) {
            console.error('The connection is not open');
            dispatchEvent(new CustomEvent(EVENT.error));

            return;
        }

        this.socket.send(JSON.stringify({
            playerId: state.playerId,
            action,
            details,
        }));
    }
}