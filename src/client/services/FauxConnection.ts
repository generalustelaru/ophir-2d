import { ClientMessage, Action, PlayState, Coordinates, MoveMessage, ZoneName, MessageKey } from '~/shared_types';
import { Communicator } from './Communicator';
import {
    TutorialScenarioStep, Instruction, ScenarioStepPartial, ScenarioStepText, Connection, EventType, EventKey,
    ServerDetail,
    TutorialState,
} from '~/client_types';
import { TutorialStepProvider } from './TutorialStepProvider';

export class FauxConnection extends Communicator implements Connection {
    private stepProvider: TutorialStepProvider;
    private currentState: PlayState | null = null;
    private expectedMessages: Array<ClientMessage> | null = null;
    private textSources: Array<ScenarioStepText> = [];

    constructor() {
        super();
        this.stepProvider = new TutorialStepProvider();
    }

    public async initialize() {
        const response = await fetch('/tutorial-data');
        const data = await response.json();

        if (typeof data != 'object' || !('state' in data) || !('text' in data)) {
            console.error('Data is not the desired object', { data });
            return;
        }

        this.currentState = data.state as PlayState;
        this.textSources = data.text as Array<ScenarioStepText>;
        this.createServerEvent({
            key: EventKey.player_id_transmission,
            message: {
                key: MessageKey.player_id_transmission,
                color: this.currentState.players[0].color,
                displayName: 'Captain',
            },
        });
        const initialScenario = this.buildStep({ partial: this.stepProvider.getNextPartial() });

        if (!initialScenario) {
            console.error('Scenarios are incomplete.');
            return;
        }

        const { instructions, expecting, index: key } = initialScenario;

        this.expectedMessages = expecting;
        this.createTourEvent({ index: key, instructions, state: this.currentState });
    }

    public sendToServer(message: ClientMessage) {
        if (null == this.currentState)
            throw new Error('No state to modify!');

        if (null == this.expectedMessages)
            return;

        const { action, payload } = message;
        const { action: expectedAction, payload: expectedPayload } = this.expectedMessages[0];

        if (action == Action.reposition_rival && this.currentState.rival.isIncluded && payload) {
            this.currentState.rival.bearings.position = payload.position;
            this.createServerEvent({
                key: EventKey.state_broadcast,
                message: {
                    key: MessageKey.state_broadcast,
                    state: this.currentState,
                } });
            return;
        }

        if (action == Action.reposition) {
            this.currentState.players[0].bearings.position = payload.position;
            this.createServerEvent({
                key: EventKey.state_broadcast,
                message: { key: MessageKey.state_broadcast, state: this.currentState },
            });

            return;
        }

        if ((action == Action.move || action == Action.move_rival) && action == expectedAction) {
            expectedPayload.position = payload.position;

            if (this.expectedMessages.length > 1) {
                const messages = this.expectedMessages as Array<MoveMessage>;
                const expectedZones = messages.map(m => m.payload.zoneId);

                if (expectedZones.includes(payload.zoneId)) {
                    expectedPayload.zoneId = payload.zoneId;
                } else {
                    this.createServerEvent({
                        key: EventKey.state_broadcast,
                        message: { key: MessageKey.state_broadcast, state: this.currentState },
                    });

                    return;
                }
            }
        }

        if (this.isSame({ action: expectedAction, payload: expectedPayload }, message)) {
            const scenario = (() => {
                switch (action) {
                    case Action.move:
                        return this.buildStep({
                            partial: this.stepProvider.getNextPartial(), newPosition: payload.position,
                        });
                    case Action.move_rival:
                        return this.buildStep({
                            partial: this.stepProvider.getNextPartial(), newRivalPosition: payload.position,
                        });
                    default:
                        return this.buildStep({ partial: this.stepProvider.getNextPartial() });
                }
            })();

            if (!scenario)
                throw new Error('Scenarios are incomplete.');

            scenario.mutate(this.currentState, (action == Action.move) ? payload.zoneId : undefined);

            const {
                instructions, expecting, laconic: notification, vp, influenceRoll, rivalRoll, index,
            } = scenario;
            this.expectedMessages = expecting;

            vp && this.createServerEvent({ key: EventKey.vp_transmission, message: vp });
            influenceRoll && this.createServerEvent({
                key: EventKey.roll_suspense_broadcast,
                message: influenceRoll,
            });
            rivalRoll && this.createServerEvent( { key: EventKey.rival_roll_broadcast, message: rivalRoll });
            this.createTourEvent({ index, state: this.currentState, instructions });

            switch (notification) {
                case 'turnStart':
                    this.createServerEvent({ key: EventKey.start_turn_transmission, message: null });
                    break;

                case 'rivalControl':
                    this.createServerEvent({ key: EventKey.rival_control_transmission, message: null });
                    break;

                default:
                    break;
            }
        } else {
            this.createServerEvent({
                key: EventKey.state_broadcast,
                message: { key: MessageKey.state_broadcast, state: this.currentState },
            });
        }
    }

    private buildStep(data?: {
        partial: ScenarioStepPartial,
        newPosition?: Coordinates,
        newRivalPosition?: Coordinates,
    }): TutorialScenarioStep | null {

        if (!data) return null;

        const { partial, newPosition, newRivalPosition } = data;
        const {
            index,
            expecting,
            vp,
            influenceRoll,
            rivalRoll,
            laconic,
            visuals: stepHighlights,
            mutate: originalMutate,
        } = partial;
        const textSource = this.textSources[index];

        if (!textSource) return null;

        if (textSource.length != stepHighlights.length) return null;

        const instructions: Array<Instruction> = stepHighlights.map(
            (highlights, index): Instruction => {
                return { ...highlights, text: textSource[index] };
            },
        );

        const mutate: (state: PlayState, z?: ZoneName) => void = (() => {
            switch (true) {
                case newPosition && (!influenceRoll || influenceRoll.rolled >= influenceRoll.toHit):
                    return (state: PlayState, z?: ZoneName): void => {
                        state.players[0].bearings.position = newPosition;
                        originalMutate(state, z);
                    };

                case !!newRivalPosition:
                    return (state: PlayState, z?: ZoneName): void => {
                        if (state.rival.isIncluded) state.rival.bearings.position = newRivalPosition;
                        originalMutate(state, z);
                    };

                default: return originalMutate;
            }
        })();

        return { index, mutate, instructions, expecting, laconic, vp, influenceRoll, rivalRoll };
    }

    private isSame(reference: any, tested: any): boolean {

        if (typeof reference != typeof tested)
            return false;

        if (typeof reference == 'object' && reference !== null) {

            if (tested === null)
                return false;

            if (Array.isArray(reference)) {
                return Array.isArray(tested)
                    && reference.length == tested.length
                    && reference.every(
                        (item, index) => this.isSame(item, tested[index]),
                    );
            }

            const refKeys = Object.keys(reference);

            return refKeys.length == Object.keys(tested).length
                && refKeys.every(
                    key => key in tested && this.isSame(reference[key], tested[key]),
                );
        }

        return reference == tested;
    }

    private createTourEvent(state: TutorialState) {
        this.createEvent({
            type: EventType.internal,
            detail: { key: EventKey.tour_update, message: state },
        });
    }

    private createServerEvent(detail: ServerDetail) {
        this.createEvent({ type: EventType.server, detail });
    }
};
