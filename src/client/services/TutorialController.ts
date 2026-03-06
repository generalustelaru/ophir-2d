import { ClientMessage, Action, PlayState, MovementPayload } from '~/shared_types';
import { Communicator } from './Communicator';
import {
    EventType, TutorialScenarioStep, Instruction, ScenarioStepPartial, ScenarioStepText, Controller,
} from '~/client_types';
import { TutorialStepProvider } from './TutorialStepProvider';

export class TutorialController extends Communicator implements Controller {
    private stepProvider: TutorialStepProvider;
    private currentState: PlayState | null = null;
    private expectedMessage: ClientMessage;
    private textSources: Array<ScenarioStepText> = [];

    constructor() {
        super();
        this.expectedMessage = { action: Action.move, payload: { zoneId: 'topLeft', position: { x:0,y:0 } } };
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

        const { instructions } = initialScenario;

        this.createEvent({ type: EventType.tour_update, detail: { instructions, state: this.currentState } });
    }

    public processMessage(message: ClientMessage) {
        if (!this.currentState)
            throw new Error('No state to modify!');

        const { action, payload } = message;

        if (action == Action.reposition) {
            this.currentState.players[0].bearings.position = payload.position;
            this.createEvent({ type: EventType.state_update, detail: this.currentState });

            return;
        }

        if (action == Action.move && this.expectedMessage.action == Action.move)
            this.expectedMessage.payload.position = payload.position;

        if (this.isSame(this.expectedMessage, message)) {
            if (this.expectedMessage.action == Action.move)
                this.currentState.players[0].bearings.position = (payload as MovementPayload).position;
        } else {
            this.createEvent({ type: EventType.state_update, detail: this.currentState });

            return;
        }

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

    private buildStep(partial?: ScenarioStepPartial): TutorialScenarioStep | null {

        if (!partial)
            return null;

        const { step, visuals: stepHighlights, mutate, expecting } = partial;
        const textSource = this.textSources.find(c => c.step == step);

        if (!textSource)
            return null;

        const { stepText } = textSource;
        if (stepText.length != stepHighlights.length)
            return null;

        const instructions: Array<Instruction> = stepHighlights.map(
            (highlights, index): Instruction => {
                return { ...highlights, text: stepText[index] };
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
