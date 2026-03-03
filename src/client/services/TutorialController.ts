import { ClientMessage, Action, PlayState, MovementPayload } from '~/shared_types';
import { Communicator } from './Communicator';
import {
    EventType, ActionScenario, Target, Instruction, ScenarioPartial, ScenarioTextSource, Controller,
} from '~/client_types';

export class TutorialController extends Communicator implements Controller {
    private currentState: PlayState | null = null;
    private expectedMessage: ClientMessage;
    private textSources: Array<ScenarioTextSource> = [];

    constructor() {
        super();
        this.expectedMessage = { action: Action.move, payload: { zoneId: 'topLeft', position: { x:0,y:0 } } };
    }

    public async initialize(_url: string, _gameId: string) {
        const response = await fetch('/tour-state');
        const data = await response.json();

        if (typeof data != 'object' || !('state' in data) || !('text' in data)) {
            console.error('Data is not the desired object', { data });
            return;
        }

        this.currentState = data.state as PlayState;
        this.textSources = data.text as Array<ScenarioTextSource>;
        this.createEvent( { type: EventType.identification, detail: { color: this.currentState.players[0].color } });
        const initialScenario = this.buildScenario(this.partials.shift());

        if (!initialScenario) {
            console.error('Scenarios are incomplete.');
            return;
        }

        const { instructions } = initialScenario;

        this.createEvent({ type: EventType.tour_update, detail: { instructions, state: this.currentState } });
    }

    public processMessage(message: ClientMessage) {
        if (!this.currentState)
            throw new Error('');

        const { action, payload } = message;

        if (action == Action.reposition) {
            this.currentState.players[0].bearings.position = payload.repositioning;
            this.createEvent({ type: EventType.state_update, detail: this.currentState });
            return;
        }

        // TODO: implement a detached system that compares messages to expectations
        if (action != this.expectedMessage.action) {
            this.createEvent({ type: EventType.state_update, detail: this.currentState });
            return;
        }

        if (this.expectedMessage.action == Action.move) {
            const p = payload as MovementPayload;

            if (p.zoneId != this.expectedMessage.payload.zoneId) {
                this.createEvent({ type: EventType.state_update, detail: this.currentState });
                return;
            }

            this.currentState.players[0].bearings.position = p.position;
        }

        const newInstructions = ((): Array<Instruction> => {
            const scenario = this.buildScenario(this.partials.shift());

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

    private partials: Array<ScenarioPartial> = [
        {
            step: 0,
            mutate: (_state: PlayState) => {},
            highlightComponent: [
                { highlights: [] },
                { highlights: [Target.centerZone] },
                { highlights: [Target.bottomRightZone] },
                { highlights: [Target.topLeftZone] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topLeft', position: { x:0,y:0 } } },
        },
        {
            step: 1,
            mutate: (state) => {
                const player = state.players[0];
                player.bearings.seaZone = 'topLeft';
                player.bearings.location = 'forest';
                player.moveActions = 1;
                player.mayUndo = true;
                player.isAnchored = true;
                player.locationActions.push(Action.load_good);
            },
            highlightComponent: [
                { highlights: [Target.movesCounter] },
                { highlights: [Target.topLeftZone] },
            ],
            expecting: { action: Action.load_good, payload: { tradeGood: 'gems', drop: [] } },
        },
    ];

    private buildScenario(partial?: ScenarioPartial): ActionScenario | null {

        if (!partial)
            return null;

        const { step, highlightComponent, mutate, expecting } = partial;
        const textSource = this.textSources.find(c => c.step == step);

        if (!textSource)
            return null;

        const { textComponent } = textSource;

        if (textComponent.length != highlightComponent.length)
            return null;

        const instructions: Array<Instruction> = highlightComponent.map(
            (highlights, index): Instruction => {
                return { ...highlights, text: textComponent[index] };
            },
        );

        return { mutate, instructions, expecting };
    }
};
