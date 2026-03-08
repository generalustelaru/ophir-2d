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
        if (null == this.currentState || null == this.expectedMessage)
            throw new Error('No state to modify!');

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

        let movePosition: Coordinates | null = null;

        if (action == Action.move && this.expectedMessage.action == Action.move) {
            this.expectedMessage.payload.position = payload.position;
            movePosition = payload.position;
        }

        if (false == this.isSame(this.expectedMessage, message)) {
            this.createEvent({ type: EventType.state_update, detail: this.currentState });

            return;
        }

        if (movePosition)
            this.currentState.players[0].bearings.position = movePosition;

        const newInstructions = ((): Array<Instruction> => {
            const scenario = this.buildStep(this.stepProvider.getNextPartial());

            if (!scenario)
                throw new Error('Scenarios are incomplete.');

            scenario.mutate(this.currentState);
            const { instructions, expecting } = scenario;
            this.expectedMessage = expecting;

            return instructions;
        })();

        this.createEvent({ type: EventType.tour_update, detail: {
            state: this.currentState,
            instructions: newInstructions,
        } });
    }

    private buildStep(data?: {step: number, partial: ScenarioStepPartial}): TutorialScenarioStep | null {

        if (!data)
            return null;

        const { step, partial } = data;
        const { visuals: stepHighlights, mutate, expecting } = partial;
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

        return { mutate, instructions, expecting };
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
