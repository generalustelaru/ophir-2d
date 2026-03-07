import { PlayState, Action } from '~/shared_types';
import { ScenarioStepPartial, Target } from '../client_types';

export class TutorialStepProvider {
    private currentStep: number = 0;
    private partials: Array<ScenarioStepPartial> = [
        {
            mutate: (_state: PlayState) => { },
            visuals: [
                { highlights: [] },
                { highlights: [] },
                { highlights: [Target.mapGroup] },
                { highlights: [Target.locationGroup] },
                { highlights: [Target.playerGroup] },
                { highlights: [Target.bottomRightZone] },
                { highlights: [Target.centerZone] },
            ],
            expecting: { action: Action.reposition, payload: { position: { x: 0, y: 0 } } },
        },
        {
            mutate: (_state: PlayState) => { },
            visuals: [
                { highlights: [] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topLeft', position: { x: 0, y: 0 } } },
        },
        {
            mutate: (state: PlayState) => {
                const player = state.players[0];
                player.bearings.seaZone = 'topLeft';
                player.bearings.location = 'forest';
                player.moveActions = 1;
                player.mayUndo = true;
                player.isAnchored = true;
                player.locationActions = [Action.load_good];
                player.destinations = ['left', 'topRight'];
            },
            visuals: [
                { highlights: [Target.movesCounter] },
                { highlights: [Target.topLeftZone] },
            ],
            expecting: { action: Action.load_good, payload: { tradeGood: 'gems', drop: null } },
        },
        {
            mutate: (state: PlayState) => {
                const player = state.players[0];
                player.moveActions = 0;
                player.cargo = ['gems', 'empty'];
                player.locationActions = [];
            },
            visuals: [
                { highlights: [Target.cargoBand, Target.movesCounter] },
                { highlights: [Target.endTurnButton] },
            ],
            expecting: { action: Action.move , payload: { zoneId: 'left', position: { x:0, y:0 } } },
        },
    ];

    public getNextPartial() {
        return {
            partial: this.partials[this.currentStep],
            step: this.currentStep++,
        };
    }
}