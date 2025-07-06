import {
    Phase, ClientIdResponse, ErrorResponse, ClientRequest, ClientMessage, ServerMessage, ResetResponse, Action,
    GameStateResponse,
} from '../../shared_types';
import { Communicator } from './Communicator';
import localState from '../state';
import { EventName } from '../client_types';

export const CommunicationService = new class extends Communicator {

    private socket: WebSocket | null = null;

    constructor() {
        super();
    }

    public createConnection(url: string) {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.info('Connection established');
            this.createEvent({ type: EventName.connected, detail: null });
        }

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.info('Connection terminated');
                this.createEvent({type: EventName.close, detail: null });
            } else {
                console.info('Connection timeout');
                this.createEvent({ type: EventName.timeout, detail: null });
            }

            this.socket?.close();
            this.socket = null;
        }

        this.socket.onerror = (error) => {
            console.error(error);
            this.createEvent({
                type: EventName.error,
                detail: { message: 'The connection encountered an error' }
            });
        }

        this.socket.onmessage = (event) => {
            const data: ServerMessage = JSON.parse(event.data);
            console.debug('<-', data);

            if (this.isClientIdResponse(data)) {
                if (localState.myId === null) {
                    this.createEvent({
                        type: EventName.identification,
                        detail: { clientId: data.clientId }
                    });
                } else {
                    this.sendMessage({
                        action: Action.waiver_client,
                        payload: { waiveredId: data.clientId, myId: localState.myId },
                    });
                }

                return;
            }

            switch (true) {
                case this.isErrorResponse(data):
                    this.createEvent({ type: EventName.error, detail:{ message: data.error } });
                    break;
                case this.isResetOrder(data):
                    this.createEvent({ type: EventName.reset, detail: data });
                    break;
                case this.isGameStateResponse(data):
                    this.createStateEvent(data);
                    break;
                default:
                    this.createEvent({ type: EventName.error, detail: { message: 'Could not determine message type.' } });
                    break;
            }
        }
    }

    public sendMessage(payload: ClientMessage) {

        if (!this.socket || !this.socket.readyState) {
            this.socket?.close();
            this.createEvent({
                type: EventName.error,
                detail: { message: 'The connection is not open' }
            });

            return;
        }

        const { gameId, myId: clientId, playerColor, playerName } = localState;
        const message: ClientRequest = { gameId, clientId, playerColor, playerName, message: payload };

        console.debug('->', message);

        this.socket.send(JSON.stringify(message));
    }

    private isGameStateResponse(data: ServerMessage): data is GameStateResponse {
        return 'state' in data;
    }

    private isClientIdResponse(data: ServerMessage): data is ClientIdResponse {
        return 'clientId' in data;
    }

    private isErrorResponse(data: ServerMessage): data is ErrorResponse {
        return 'error' in data;
    }

    private isResetOrder(data: ServerMessage): data is ResetResponse {
        return 'resetFrom' in data;
    }

    private createStateEvent(data: GameStateResponse) {
        const { state } = data;

        switch (state.sessionPhase) {
            case Phase.enrolment:
                return this.createEvent({ type: EventName.enrolment_update, detail: state });
            case Phase.setup:
                return this.createEvent({ type: EventName.setup_update, detail: state });
            case Phase.play:
                return this.createEvent({ type: EventName.play_update, detail: state });
            default:
                return this.createEvent({
                    type: EventName.error, detail: { message: 'Unknown phase value in state.'}
                });
        }
    }
}
