import { PlayState, Action } from '~/shared_types';
import { Panel, ScenarioStepPartial, Target } from '../client_types';

export class TutorialStepProvider {
    private currentStep: number = 0;
    private partials: Array<ScenarioStepPartial> = [
        {
            step: 0,
            mutate: (_state: PlayState) => { },
            visuals: [
                { panel: Panel.mapCenter, highlights: [] },
                { panel: null, highlights: [] },
                { panel: null, highlights: [Target.centerZone, Target.playerPlacard] },
                { panel: null, highlights: [Target.bottomRightZone] },
                { panel: null, highlights: [Target.topLeftZone] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topLeft', position: { x: 0, y: 0 } } },
        },
        {
            step: 1,
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
                { panel: null, highlights: [Target.movesCounter] },
                { panel: null, highlights: [Target.topLeftZone] },
            ],
            expecting: { action: Action.load_good, payload: { tradeGood: 'gems', drop: null } },
        },
        {
            step: 2,
            mutate: (state: PlayState) => {
                const player = state.players[0];
                player.moveActions = 0;
                player.cargo = ['gems', 'empty'];
                player.locationActions = [];
            },
            visuals: [
                { panel: null, highlights: [Target.cargoBand, Target.movesCounter] },
                { panel: null, highlights: [Target.endTurnButton] },
            ],
            expecting: { action: Action.move , payload: { zoneId: 'left', position: { x:0, y:0 } } },
        },
    ];

    public getNextPartial() {
        return this.partials[this.currentStep++];
    }
}