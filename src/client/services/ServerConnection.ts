import { ClientRequest, ClientMessage, ServerMessage, MessageKey } from '~/shared_types';
import { Communicator } from './Communicator';
import { EventType, Connection, EventKey, ServerDetail } from '~/client_types';

export class ServerConnection extends Communicator implements Connection {

    private socket: WebSocket | null = null;
    private readonly isLocal: boolean;

    constructor(protocol: 'ws:' | 'wss:') {
        super();
        this.isLocal = protocol == 'ws:' || false;
    }

    public initialize(url: string, gameId: string) {
        this.socket = new WebSocket(`${url}?gameId=${gameId}`);

        this.socket.onopen = () => {
            console.info('Connection established.');
        };

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.info('Connection terminated');
                this.createServerEvent({ key: EventKey.ws_closed, message: null });
            } else {
                console.info('Connection timeout');
                this.createServerEvent({ key: EventKey.ws_timeout, message: null });
            }

            this.socket?.close();
            this.socket = null;
        };

        this.socket.onerror = (error) => {
            console.error(error);
            this.createEvent({
                type: EventType.internal,
                detail: { key:EventKey.error, message: 'The connection encountered an error' },
            });
        };

        this.socket.onmessage = (event) => {
            const message: ServerMessage = JSON.parse(event.data);
            this.isLocal && console.debug('<-', message);

            switch (message.key) {
                case MessageKey.state_broadcast:
                    return this.createServerEvent({ key: EventKey.state_broadcast, message });
                case MessageKey.reset_broadcast:
                    return this.createServerEvent({ key: EventKey.reset_broadcast, message: message });
                case MessageKey.error_transmission:
                    return this.createErrorEvent(message.error);
                case MessageKey.player_id_transmission:
                    return this.createServerEvent({ key: EventKey.player_id_transmission, message: message });
                case MessageKey.not_found_transmission:
                    return this.createServerEvent({ key: EventKey.not_found_transmission, message: null });
                case MessageKey.vp_transmission:
                    return this.createServerEvent({ key: EventKey.vp_transmission, message: message });
                case MessageKey.turn_transmission:
                    return this.createServerEvent({ key: EventKey.start_turn_transmission, message: null });
                case MessageKey.rival_control_transmission:
                    return this.createServerEvent({ key: EventKey.rival_control_transmission, message: null });
                case MessageKey.influence_roll_broadcast:
                    return this.createServerEvent({ key: EventKey.roll_suspense_broadcast, message: message });
                case MessageKey.force_turn_transmission:
                    return this.createServerEvent({ key: EventKey.force_turn_transmission, message: null });
                case MessageKey.token_expired_transmission:
                    return this.createServerEvent({ key: EventKey.expired_transmission, message: null });
                case MessageKey.socket_switch_transmission:
                    return this.createServerEvent({ key: EventKey.client_switch_transmission, message: null });
                case MessageKey.newRival_influence_broadcast:
                    return this.createServerEvent({ key: EventKey.rival_roll_broadcast, message: message });
                default:
                    this.createErrorEvent('Could not determine message type.');
            }
        };
    }

    public sendToServer(message: ClientMessage) {

        if (!this.socket || !this.socket.readyState) {
            this.socket?.close();
            this.createErrorEvent('The connection is not open');

            return;
        }

        const request: ClientRequest = { message };

        this.isLocal && console.debug('->', request);

        this.socket.send(JSON.stringify(request));
    }

    private createServerEvent(detail: ServerDetail) {
        this.createEvent({ type: EventType.server, detail });
    }

    private createErrorEvent(message: string) {
        this.createEvent({ type: EventType.internal,detail: { key: EventKey.error, message } });
    }
};
