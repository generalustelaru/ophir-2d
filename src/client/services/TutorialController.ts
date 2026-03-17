import { ClientMessage, Action, PlayState, Coordinates } from '~/shared_types';
import { Communicator } from './Communicator';
import {
    EventType, TutorialScenarioStep, Instruction, ScenarioStepPartial, ScenarioStepText, Controller,
} from '~/client_types';
import { TutorialStepProvider } from './TutorialStepProvider';

export class TutorialController extends Communicator implements Controller {
    private stepProvider: TutorialStepProvider;
    private currentState: PlayState | null = null;
    private expectedMessage: ClientMessage | null = null;
    private textSources: Array<ScenarioStepText> = [];

    constructor() {
        super();
        this.stepProvider = new TutorialStepProvider();
    }

    public async initialize(_url: string, _gameId: string) {
        const response = await fetch('/tutorial-data');
        const data = await response.json();

        if (typeof data != 'object' || !('state' in data) || !('text' in data)) {
            console.error('Data is not the desired object', { data });
            return;
        }

        this.currentState = data.state as PlayState;
        this.textSources = data.text as Array<ScenarioStepText>;
        this.createEvent( { type: EventType.identification, detail: { color: this.currentState.players[0].color } });
        const initialScenario = this.buildStep({ partial: this.stepProvider.getNextPartial() });

        if (!initialScenario) {
            console.error('Scenarios are incomplete.');
            return;
        }

        const { instructions, expecting, index: key } = initialScenario;

        this.expectedMessage = expecting;
        this.createEvent({ type: EventType.tour_update, detail: { index: key, instructions, state: this.currentState } });
    }

    public processMessage(message: ClientMessage) {
        if (null == this.currentState)
            throw new Error('No state to modify!');

        if (null == this.expectedMessage)
            return;

        const { action, payload } = message;
        const { action: expectedAction, payload: expectedPayload } = this.expectedMessage;

        if (action == Action.reposition_rival && this.currentState.rival.isIncluded && payload) {
            this.currentState.rival.bearings.position = payload.position;
            this.createEvent({ type: EventType.state_update, detail: this.currentState });

            return;
        }

        if (action == Action.reposition) {
            this.currentState.players[0].bearings.position = payload.position;
            this.createEvent({ type: EventType.state_update, detail: this.currentState });

            if (expectedAction == Action.reposition)
                expectedPayload.position = payload.position;
            else
                return;
        }

        if ((action == Action.move || action == Action.move_rival) && action == expectedAction)
            expectedPayload.position = payload.position;

        if (this.isSame(this.expectedMessage, message)) {
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

            scenario.mutate(this.currentState);
            const { instructions, expecting, laconic: notification, vpDetail, failedRollDetail, index } = scenario;
            this.expectedMessage = expecting;

            vpDetail && this.createEvent({ type: EventType.vp_transmission, detail: vpDetail });
            failedRollDetail && this.createEvent({ type: EventType.failed_roll, detail: failedRollDetail });
            this.createEvent({ type: EventType.tour_update, detail: {
                index,
                state: this.currentState,
                instructions,
            } });


            switch (notification) {
                case 'turnStart':
                    this.createEvent({ type: EventType.start_turn, detail: null });
                    break;
                case 'rivalControl':
                    this.createEvent( { type: EventType.rival_control_transmission, detail: null });
                    break;
                default:
                    break;
            }
        } else {
            this.createEvent({ type: EventType.state_update, detail: this.currentState });
        }
    }

    private buildStep(data?: {
        partial: ScenarioStepPartial,
        newPosition?: Coordinates,
        newRivalPosition?: Coordinates,
    }): TutorialScenarioStep | null {

        if (!data)
            return null;

        const { partial, newPosition, newRivalPosition } = data;
        const {
            index,
            expecting,
            vpDetail,
            failedRollDetail,
            laconic,
            visuals: stepHighlights,
            mutate: originalMutate,
        } = partial;
        const textSource = this.textSources[index];

        if (!textSource)
            return null;

        if (textSource.length != stepHighlights.length)
            return null;

        const instructions: Array<Instruction> = stepHighlights.map(
            (highlights, index): Instruction => {
                return { ...highlights, text: textSource[index] };
            },
        );

        const mutate: (state: PlayState) => void = (() => {
            switch (true) {
                case newPosition && !failedRollDetail:
                    return (state: PlayState): void => {
                        state.players[0].bearings.position = newPosition;
                        originalMutate(state);
                    };
                case !!newRivalPosition:
                    return (state: PlayState): void => {
                        if (state.rival.isIncluded)
                            state.rival.bearings.position = newRivalPosition;
                        originalMutate(state);
                    };
                default:
                    return originalMutate;
            }
        })();

        return { index, mutate, instructions, expecting, laconic, vpDetail, failedRollDetail };
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
};
