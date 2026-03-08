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
        const initialScenario = this.buildStep(this.stepProvider.getNextPartial());

        if (!initialScenario) {
            console.error('Scenarios are incomplete.');
            return;
        }

        const { instructions, expecting } = initialScenario;

        this.expectedMessage = expecting;
        this.createEvent({ type: EventType.tour_update, detail: { instructions, state: this.currentState } });
    }

    public processMessage(message: ClientMessage) {
        if (null == this.currentState)
            throw new Error('No state to modify!');

        if (null == this.expectedMessage)
            return;

        const { action, payload } = message;

        if (action == Action.reposition_rival && this.currentState.rival.isIncluded && payload) {
            this.currentState.rival.bearings.position = payload.position;
            this.createEvent({ type: EventType.state_update, detail: this.currentState });

            return;
        }

        if (action == Action.reposition) {
            this.currentState.players[0].bearings.position = payload.position;
            this.createEvent({ type: EventType.state_update, detail: this.currentState });

            if (this.expectedMessage.action != Action.reposition)
                return;
            else
                this.expectedMessage.payload.position = payload.position;
        }

        if (action == Action.move && action == this.expectedMessage.action) {
            this.expectedMessage.payload.position = payload.position;
        }

        if (this.isSame(this.expectedMessage, message)) {
            const scenario = action == Action.move
                ? this.buildStep({ ...this.stepProvider.getNextPartial(), newPosition: payload.position })
                : this.buildStep(this.stepProvider.getNextPartial());

            if (!scenario)
                throw new Error('Scenarios are incomplete.');

            scenario.mutate(this.currentState);
            const { instructions, expecting, transmission } = scenario;
            this.expectedMessage = expecting;

            this.createEvent({ type: EventType.tour_update, detail: {
                state: this.currentState,
                instructions,
            } });

            switch (transmission) {
                case 'turnStart':
                    this.createEvent({ type: EventType.start_turn, detail: null });
                    break;
                case 'rivalControl':
                    this.createEvent( { type: EventType.rival_control_transmission, detail: null });
                    break;
                case 'vpIncrease':
                    this.createEvent({ type: EventType.vp_transmission, detail: { vp: 99 } });
                    break;
                default:
                    break;
            }
        } else {
            this.createEvent({ type: EventType.state_update, detail: this.currentState });
        }
    }

    private buildStep(data?: {
        step: number,
        partial: ScenarioStepPartial,
        newPosition?: Coordinates,
    }): TutorialScenarioStep | null {

        if (!data)
            return null;

        const { step, partial, newPosition } = data;
        const { visuals: stepHighlights, mutate, expecting, transmission: serverWillTransmit } = partial;
        const textSource = this.textSources[step];

        if (!textSource)
            return null;

        if (textSource.length != stepHighlights.length)
            return null;

        const instructions: Array<Instruction> = stepHighlights.map(
            (highlights, index): Instruction => {
                return { ...highlights, text: textSource[index] };
            },
        );

        const ammendedMutate = newPosition && serverWillTransmit != 'failedMove'
            ? (state: PlayState): void => {
                state.players[0].bearings.position = newPosition;
                mutate(state);
            }
            : mutate;

        return { mutate: ammendedMutate, instructions, expecting, transmission: serverWillTransmit };
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
