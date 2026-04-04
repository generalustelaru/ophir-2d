import {
    ErrorTransmission, ClientRequest, ClientMessage, ServerMessage, ResetBroadcast, StateBroadcast, VpTransmission,
    TurnTransmission, RivalControlTransmission, ForceTurnTransmission, PlayerIdTransmission, NewRivalInfluenceBroadcast,
    NotFoundTransmission, TokenExpiredTransmission, SocketSwitchTransmission, InfluenceRollBroadcast,
} from '~/shared_types';
import { Communicator } from './Communicator';
import { EventType, Connection, DetailKey, ServerDetail } from '~/client_types';

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
                this.createServerEvent({ key: DetailKey.ws_closed, message: null });
            } else {
                console.info('Connection timeout');
                this.createServerEvent({ key: DetailKey.ws_timeout, message: null });
            }

            this.socket?.close();
            this.socket = null;
        };

        this.socket.onerror = (error) => {
            console.error(error);
            this.createEvent({
                type: EventType.internal,
                detail: { key:DetailKey.error, message: 'The connection encountered an error' },
            });
        };

        this.socket.onmessage = (event) => {
            const message: ServerMessage = JSON.parse(event.data);
            this.isLocal && console.debug('<-', message);

            switch (true) {
                case this.isStateBroadcast(message):
                    return this.createServerEvent({ key: DetailKey.state_broadcast, message });

                case this.isTurnTransmission(message):
                    return this.createServerEvent({ key: DetailKey.start_turn_transmission, message: null });

                case this.isInfluenceRollBroadcast(message):
                    return this.createServerEvent({ key: DetailKey.roll_suspense_broadcast, message: message });

                case this.isNewRivalInfluenceBroadcast(message):
                    return this.createServerEvent({ key: DetailKey.rival_roll_broadcast, message: message });

                case this.isForceTurnTransmission(message):
                    return this.createServerEvent({ key: DetailKey.force_turn_transmission, message: null });

                case this.isNotFoundTransmission(message):
                    return this.createServerEvent({ key: DetailKey.not_found_transmission, message: null });

                case this.isVpTransmission(message):
                    return this.createServerEvent({ key: DetailKey.vp_transmission, message: message });

                case this.isRivalControlTransmission(message):
                    return this.createServerEvent({ key: DetailKey.rival_control_transmission, message: null });

                case this.isColorTransmission(message):
                    return this.createServerEvent({ key: DetailKey.player_id_transmission, message: message });

                case this.isResetBroadcast(message):
                    return this.createServerEvent({ key: DetailKey.reset_broadcast, message: message });

                case this.isExpiredTransmission(message):
                    return this.createServerEvent({ key: DetailKey.expired_transmission, message: null });

                case this.isClientSwitchTransmission(message):
                    return this.createServerEvent({ key: DetailKey.client_switch_transmission, message: null });

                case this.isErrorTransmission(message):
                    return this.createErrorEvent(message.error);

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

    private isStateBroadcast(data: ServerMessage): data is StateBroadcast {
        return 'state' in data;
    }

    private isTurnTransmission(data: ServerMessage): data is TurnTransmission {
        return 'turnStart' in data;
    }

    private isInfluenceRollBroadcast(data: ServerMessage): data is InfluenceRollBroadcast {
        return 'rolled' in data && 'toHit' in data;
    }

    private isNewRivalInfluenceBroadcast(data: ServerMessage): data is NewRivalInfluenceBroadcast {
        return 'rivalRoll' in data;
    }

    private isForceTurnTransmission(data: ServerMessage): data is ForceTurnTransmission {
        return 'forceTurn' in data;
    }

    private isNotFoundTransmission(data: ServerMessage): data is NotFoundTransmission {
        return 'notFound' in data;
    }

    private isColorTransmission(data: ServerMessage): data is PlayerIdTransmission {
        return 'color' in data;
    }

    private isVpTransmission(data: ServerMessage): data is VpTransmission {
        return 'vp' in data;
    }

    private isRivalControlTransmission(data: ServerMessage): data is RivalControlTransmission {
        return 'rivalControl' in data;
    }

    private isErrorTransmission(data: ServerMessage): data is ErrorTransmission {
        return 'error' in data;
    }

    private isResetBroadcast(data: ServerMessage): data is ResetBroadcast {
        return 'resetFrom' in data;
    }

    private isExpiredTransmission(data: ServerMessage): data is TokenExpiredTransmission {
        return 'expired' in data;
    }

    private isClientSwitchTransmission(data: ServerMessage): data is SocketSwitchTransmission {
        return 'switch' in data;
    }

    private createServerEvent(detail: ServerDetail) {
        this.createEvent({ type: EventType.server, detail });
    }

    private createErrorEvent(message: string) {
        this.createEvent({ type: EventType.internal,detail: { key: DetailKey.error, message } });
    }
};
