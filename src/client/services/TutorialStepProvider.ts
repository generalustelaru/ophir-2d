import { PlayState, Action } from '~/shared_types';
import { ScenarioStepPartial, Target } from '../client_types';

export class TutorialStepProvider {
    private currentStep: number = 0;
    private partials: Array<ScenarioStepPartial> = [
        {
            transmission: null,
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
            transmission: null,
            mutate: (_state: PlayState) => { },
            visuals: [
                { highlights: [] },
                { highlights: [Target.movesCounter] },
                { highlights: [Target.topLeftZone, Target.leftZone, Target.bottomLeftZone, Target.bottomRightZone] },
                { highlights: [Target.rightZone, Target.topRightZone] },
                { highlights: [Target.centerZone] },
                { highlights: [Target.movesCounter, Target.topLeftZone] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topLeft', position: { x: 0, y: 0 } } },
        },
        {
            transmission: null,
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
                { highlights: [Target.centerZone] },
                { highlights: [Target.topRightZone, Target.slot_3] },
                { highlights: [Target.topLeftZone] },
                { highlights: [Target.topLeftZone] },
            ],
            expecting: { action: Action.load_good, payload: { tradeGood: 'gems', drop: null } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const player = state.players[0];
                player.moveActions = 0;
                player.cargo = ['gems', 'empty'];
                player.locationActions = [];
            },
            visuals: [
                { highlights: [Target.cargoBand] },
                { highlights: [] },
                { highlights: [Target.topLeftZone] },
                { highlights: [Target.endTurnButton] },
            ],
            expecting: { action: Action.end_turn , payload: null },
        },
        {
            transmission: 'turnStart',
            mutate: (state: PlayState) => {
                const player = state.players[0];
                player.overnightZone = 'topLeft';
                player.mayUndo = false;
                player.isAnchored = false;
                player.moveActions = 2;
                player.destinations = ['left', 'center', 'topRight'];
            },
            visuals: [
                { highlights: [] },
                { highlights: [Target.topRightZone] },
                { highlights: [Target.rivalInfluence] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topRight', position: { x: 0, y: 0 } } },
        },
        {
            transmission: 'failedMove',
            mutate: (state: PlayState) => {
                const player = state.players[0];
                player.influence = 2;
                player.moveActions = 1;

                if (state.rival.isIncluded)
                    state.rival.influence = 2;
            },
            visuals: [
                { highlights: [Target.movesCounter, Target.influenceDie] },
                { highlights: [Target.rivalInfluence] },
                { highlights: [Target.topRightZone] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topRight', position: { x: 0, y: 0 } } },
        },
        {
            transmission: 'rivalControl',
            mutate: (state: PlayState) => {
                const player = state.players[0];
                player.influence = 6;
                player.moveActions = 0;
                player.bearings.seaZone = 'topRight';
                player.bearings.location = 'market';
                player.destinations = [];
                player.isAnchored = true;
                player.isHandlingRival = true;

                if (state.rival.isIncluded) {
                    const rival = state.rival;
                    rival.activePlayerColor = 'Purple',
                    rival.isControllable = true;
                }
            },
            visuals: [
                { highlights: [] },
                { highlights: [Target.rivalPlacard] },
                { highlights: [Target.rivalMoves] },
                { highlights: [Target.rightZone] },
            ],
            expecting: { action: Action.move_rival, payload: { zoneId: 'right', position: { x: 0, y: 0 } } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                state.players[0].mayUndo = true;

                if(state.rival.isIncluded) {
                    const rival = state.rival;
                    rival.bearings.seaZone = 'right';
                    rival.bearings.location = 'treasury';
                    rival.moves = 1;
                    rival.destinations = ['bottomRight'];
                }
            },
            visuals: [
                { highlights: [] },
                { highlights: [Target.concludeRival] },
            ],
            expecting: { action: Action.end_rival_turn, payload: null },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                if(state.rival.isIncluded) {
                    const r = state.rival;
                    r.isControllable = false;
                    r.influence = 6;
                    r.moves = 2;
                }
                const p = state.players[0];
                p.isHandlingRival = false;
                p.locationActions = [Action.sell_goods, Action.sell_specialty];
                p.feasibleTrades = [{ slot: 'slot_3', missing: [] }];
            },
            visuals: [
                { highlights: [Target.rivalInfluence] },
                { highlights: [Target.marketArea] },
                { highlights: [Target.slot_3] },
                { highlights: [Target.specialtyButton] },
                { highlights: [Target.specialistBand] },
                { highlights: [] },
                { highlights: [Target.specialtyButton] },
            ],
            expecting: { action: Action.sell_specialty, payload: null },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.cargo = ['empty', 'empty'];
                p.coins = 1;
                p.mayUndo = true;
                p.locationActions = [];
                // p.feasibleTrades = [];
            },
            visuals: [
                { highlights: [Target.cargoBand, Target.coinDial] },
                { highlights: [Target.undoButton] },
            ],
            expecting: { action: Action.undo, payload: null },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.cargo = ['gems', 'empty'];
                p.coins = 0;
                p.mayUndo = false;
                p.locationActions = [Action.sell_goods, Action.sell_specialty];
            },
            visuals: [
                { highlights: [] },
                { highlights: [Target.slot_3] },
            ],
            expecting: { action: Action.sell_goods, payload: { slot: 'slot_3' } },
        },
        {
            transmission: null,
            mutate: (_state: PlayState) => { },
            visuals: [
                { highlights: [] },
            ],
            expecting: null,
        },
    ];

    public getNextPartial() {
        return {
            partial: this.partials[this.currentStep],
            step: this.currentStep++,
        };
    }
}