import {
    Phase, ClientIdResponse, ErrorResponse, ClientRequest, ClientMessage, ServerMessage, ResetResponse, StateResponse,
    VpTransmission,
} from "~/shared_types";
import { Communicator } from './Communicator';
import localState from '../state';
import { EventType } from "~/client_types";

export const CommunicationService = new class extends Communicator {

    private socket: WebSocket | null = null;

    constructor() {
        super();
    }

    public createConnection(url: string) {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.info('Connection established');
            this.createEvent({ type: EventType.connected, detail: null });
        }

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.info('Connection terminated');
                this.createEvent({type: EventType.close, detail: null });
            } else {
                console.info('Connection timeout');
                this.createEvent({ type: EventType.timeout, detail: null });
            }

            this.socket?.close();
            this.socket = null;
        }

        this.socket.onerror = (error) => {
            console.error(error);
            this.createEvent({
                type: EventType.error,
                detail: { message: 'The connection encountered an error' }
            });
        }

        this.socket.onmessage = (event) => {
            const data: ServerMessage = JSON.parse(event.data);
            console.debug('<-', data);

            if (this.isClientIdResponse(data)) {
                this.createEvent({
                    type: EventType.identification,
                    detail: { socketId: data.socketId }
                });

                return;
            }

            switch (true) {
                case this.isGameStateResponse(data):
                    this.createStateEvent(data);
                    break;
                case this.isVictoryPointsTransmission(data):
                    this.createEvent({ type: EventType.vp_transmission, detail: data })
                    break;
                case this.isResetOrder(data):
                    this.createEvent({ type: EventType.reset, detail: data });
                    break;
                case this.isErrorResponse(data):
                    this.createEvent({ type: EventType.error, detail:{ message: data.error } });
                    break;
                default:
                    this.createEvent({ type: EventType.error, detail: { message: 'Could not determine message type.' } });
                    break;
            }
        }
    }

    public sendMessage(message: ClientMessage) {

        if (!this.socket || !this.socket.readyState) {
            this.socket?.close();
            this.createEvent({
                type: EventType.error,
                detail: { message: 'The connection is not open' }
            });

            return;
        }

        const { gameId, socketId, playerColor, playerName } = localState;
        const request: ClientRequest = { gameId, socketId, playerColor, playerName, message };

        console.debug('->', request);

        this.socket.send(JSON.stringify(request));
    }

    private isGameStateResponse(data: ServerMessage): data is StateResponse {
        return 'state' in data;
    }

    private isVictoryPointsTransmission(data: ServerMessage): data is VpTransmission {
        return 'vp' in data;
    }

    private isClientIdResponse(data: ServerMessage): data is ClientIdResponse {
        return 'socketId' in data;
    }

    private isErrorResponse(data: ServerMessage): data is ErrorResponse {
        return 'error' in data;
    }

    private isResetOrder(data: ServerMessage): data is ResetResponse {
        return 'resetFrom' in data;
    }

    private createStateEvent(data: StateResponse) {
        const { state } = data;

        switch (state.sessionPhase) {
            case Phase.enrolment:
                return this.createEvent({ type: EventType.enrolment_update, detail: state });
            case Phase.setup:
                return this.createEvent({ type: EventType.setup_update, detail: state });
            case Phase.play:
                return this.createEvent({ type: EventType.play_update, detail: state });
            default:
                return this.createEvent({
                    type: EventType.error, detail: { message: 'Unknown phase value in state.'}
                });
        }
    }
}
