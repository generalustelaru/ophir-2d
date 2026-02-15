import {
    ErrorResponse, ClientRequest, ClientMessage, ServerMessage, ResetResponse, StateResponse, VpTransmission,
    TurnNotificationTransmission, RivalControlTransmission, ForceTurnNotificationTransmission, ColorTransmission,
    NotFoundTransmission, ExpiredTransmission, SocketSwitchTransmission,
} from '~/shared_types';
import { Communicator } from './Communicator';
import { EventType } from '~/client_types';

export class CommunicationService extends Communicator {

    private socket: WebSocket | null = null;

    constructor() {
        super();
    }

    public createConnection(url: string, gameId: string) {
        this.socket = new WebSocket(`${url}?gameId=${gameId}`);

        this.socket.onopen = () => {
            console.info('Connection established.');
        };

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.info('Connection terminated');
                this.createEvent({ type: EventType.close, detail: null });
            } else {
                console.info('Connection timeout');
                this.createEvent({ type: EventType.timeout, detail: null });
            }

            this.socket?.close();
            this.socket = null;
        };

        this.socket.onerror = (error) => {
            console.error(error);
            this.createEvent({
                type: EventType.error,
                detail: { message: 'The connection encountered an error' },
            });
        };

        this.socket.onmessage = (event) => {
            const data: ServerMessage = JSON.parse(event.data);
            console.debug('<-', data);

            switch (true) {
                case this.isGameStateResponse(data):
                    this.createStateEvent(data);
                    break;
                case this.isTurnNotification(data):
                    this.createEvent({ type: EventType.start_turn, detail: null });
                    break;
                case this.isForceTurnNotification(data):
                    this.createEvent( { type: EventType.force_turn, detail: null });
                    break;
                case this.isNotFoundTransmission(data):
                    this.createEvent({ type: EventType.abandon, detail: null });
                    break;
                case this.isVictoryPointsTransmission(data):
                    this.createEvent({ type: EventType.vp_transmission, detail: data });
                    break;
                case this.isRivalControlTransmission(data):
                    this.createEvent( { type: EventType.rival_control_transmission, detail: null });
                    break;
                case this.isColorTransmission(data):
                    this.createEvent( { type: EventType.identification, detail: data });
                    break;
                case this.isResetOrder(data):
                    this.createEvent({ type: EventType.reset, detail: data });
                    break;
                case this.isErrorResponse(data):
                    this.createEvent({ type: EventType.error, detail:{ message: data.error } });
                    break;
                case this.isExpiredTransmission(data):
                    this.createEvent( { type: EventType.deauthenticate, detail: null });
                    break;
                case this.isClientSwitchTransmission(data):
                    this.createEvent({ type: EventType.client_switch, detail: null });
                    break;
                default:
                    this.createEvent({ type: EventType.error, detail: { message: 'Could not determine message type.' } });
                    break;
            }
        };
    }

    public sendMessage(message: ClientMessage) {

        if (!this.socket || !this.socket.readyState) {
            this.socket?.close();
            this.createEvent({
                type: EventType.error,
                detail: { message: 'The connection is not open' },
            });

            return;
        }

        const request: ClientRequest = { message };

        console.debug('->', request);

        this.socket.send(JSON.stringify(request));
    }

    private isGameStateResponse(data: ServerMessage): data is StateResponse {
        return 'state' in data;
    }

    private isTurnNotification(data: ServerMessage): data is TurnNotificationTransmission {
        return 'turnStart' in data;
    }

    private isForceTurnNotification(data: ServerMessage): data is ForceTurnNotificationTransmission {
        return 'forceTurn' in data;
    }

    private isNotFoundTransmission(data: ServerMessage): data is NotFoundTransmission {
        return 'notFound' in data;
    }

    private isColorTransmission(data: ServerMessage): data is ColorTransmission {
        return 'color' in data;
    }

    private isVictoryPointsTransmission(data: ServerMessage): data is VpTransmission {
        return 'vp' in data;
    }

    private isRivalControlTransmission(data: ServerMessage): data is RivalControlTransmission {
        return 'rivalControl' in data;
    }

    private isErrorResponse(data: ServerMessage): data is ErrorResponse {
        return 'error' in data;
    }

    private isResetOrder(data: ServerMessage): data is ResetResponse {
        return 'resetFrom' in data;
    }

    private isExpiredTransmission(data: ServerMessage): data is ExpiredTransmission {
        return 'expired' in data;
    }

    private isClientSwitchTransmission(data: ServerMessage): data is SocketSwitchTransmission {
        return 'switch' in data;
    }

    private createStateEvent(data: StateResponse) {
        return this.createEvent({ type: EventType.state_update, detail: data.state });
    }
};
