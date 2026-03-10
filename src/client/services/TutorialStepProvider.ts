import { PlayState, Action } from '~/shared_types';
import { ScenarioStepPartial, Target } from '../client_types';

const position = { x: 0, y: 0 } as const;
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
            expecting: { action: Action.reposition, payload: { position } },
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
            expecting: { action: Action.move, payload: { zoneId: 'topLeft', position } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.bearings.seaZone = 'topLeft';
                p.bearings.location = 'forest';
                p.moveActions = 1;
                p.mayUndo = true;
                p.isAnchored = true;
                p.locationActions = [Action.load_good];
                p.destinations = ['left', 'topRight'];
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
                const p = state.players[0];
                p.moveActions = 0;
                p.cargo = ['gems', 'empty'];
                p.locationActions = [];
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
                const p = state.players[0];
                p.overnightZone = 'topLeft';
                p.mayUndo = false;
                p.isAnchored = false;
                p.moveActions = 2;
                p.destinations = ['left', 'center', 'topRight'];
            },
            visuals: [
                { highlights: [] },
                { highlights: [Target.topRightZone] },
                { highlights: [Target.rivalInfluence] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topRight', position } },
        },
        {
            transmission: 'failedMove',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.influence = 2;
                p.moveActions = 1;

                if (state.rival.isIncluded)
                    state.rival.influence = 2;
            },
            visuals: [
                { highlights: [Target.movesCounter, Target.influenceDie] },
                { highlights: [Target.rivalInfluence] },
                { highlights: [Target.topRightZone] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topRight', position } },
        },
        {
            transmission: 'rivalControl',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.influence = 6;
                p.moveActions = 0;
                p.bearings.seaZone = 'topRight';
                p.bearings.location = 'market';
                p.destinations = [];
                p.isAnchored = true;
                p.isHandlingRival = true;

                if (state.rival.isIncluded) {
                    const r = state.rival;
                    r.activePlayerColor = 'Purple',
                    r.isControllable = true;
                }
            },
            visuals: [
                { highlights: [] },
                { highlights: [Target.rivalPlacard] },
                { highlights: [Target.rivalMoves] },
                { highlights: [Target.rightZone] },
            ],
            expecting: { action: Action.move_rival, payload: { zoneId: 'right', position } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                state.players[0].mayUndo = true;

                if(state.rival.isIncluded) {
                    const r = state.rival;
                    r.bearings.seaZone = 'right';
                    r.bearings.location = 'treasury';
                    r.moves = 1;
                    r.destinations = ['bottomRight'];
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
                p.mayUndo = false;
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
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.cargo = ['empty', 'empty'];
                p.coins = 3;
                p.feasibleTrades = [];
                p.locationActions = [];
                const m = state.market;
                m.deckSize -= 1;
                m.slot_3 = m.slot_2;
                m.slot_2 = m.slot_1;
                m.slot_1 = m.future;
                m.future = { request: ['ebony','linen'], reward: { coins: 2, favorAndVp: 2 } };
            },
            visuals: [
                { highlights: [Target.goldForCoin] },
                { highlights: [Target.marketArea] },
                { highlights: [Target.marketArea, Target.deck] },
                { highlights: [Target.marketArea] },
                { highlights: [Target.fluctuation_up, Target.fluctuation_down, Target.temple_mark] },
                { highlights: [Target.fluctuation_up] },
                { highlights: [Target.fluctuation_down] },
                { highlights: [Target.fluctuation_up, Target.fluctuation_down] },
                { highlights: [Target.temple_mark] },
                { highlights: [Target.endTurnButton] },
            ],
            expecting: { action: Action.end_turn, payload: null },
        },
        {
            transmission: 'turnStart',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.isAnchored = false;
                p.moveActions = 2;
                p.destinations = ['right', 'topLeft'];
            },
            visuals: [
                { highlights: [Target.rightZone, Target.goldForCoin, Target.silverForCoin] },
                { highlights: [Target.rightZone, Target.rivalInfluence] },
                { highlights: [Target.rivalInfluence] },
                { highlights: [Target.favorDial, Target.cargoBand] },
                { highlights: [Target.bottomRightZone, Target.templeArea] },
                { highlights: [Target.topLeftZone] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'topLeft', position } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.isAnchored = true;
                p.moveActions = 1;
                p.bearings.seaZone = 'topLeft';
                p.bearings.location = 'mines';
                p.destinations = ['left', 'center'];
                p.mayUndo = true;
                p.locationActions = [Action.load_good];
            },
            visuals: [
                { highlights: [Target.marketCard] },
                { highlights: [Target.topLeftZone] },
            ],
            expecting: { action: Action.load_good, payload: { tradeGood: 'gems', drop: null } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.moveActions = 0;
                p.cargo = ['gems', 'empty'];
                p.mayUndo = true;
                p.locationActions = [];
            },
            visuals: [
                { highlights: [Target.endTurnButton] },
            ],
            expecting: { action: Action.end_turn, payload: null },
        },
        {
            transmission: 'turnStart',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.isAnchored = false;
                p.mayUndo = false;
                p.moveActions = 2;
                p.destinations = ['left', 'center', 'topRight'];
            },
            visuals: [
                { highlights: [Target.centerZone] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'center', position } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.moveActions = 1;
                p.bearings.seaZone = 'center';
                p.bearings.location = 'farms';
                p.destinations = ['left', 'bottomLeft', 'bottomRight'];
                p.mayUndo = true;
                p.isAnchored = true;
                p.locationActions = [Action.load_good];
            },
            visuals: [
                { highlights: [Target.centerZone] },
            ],
            expecting: { action: Action.load_good, payload: { tradeGood: 'linen', drop: null } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.moveActions = 0;
                p.locationActions = [];
                p.cargo = ['gems', 'linen'];
            },
            visuals: [
                { highlights: [Target.endTurnButton] },
            ],
            expecting: { action: Action.end_turn, payload: null },
        },
        {
            transmission: 'turnStart',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.mayUndo = false;
                p.isAnchored = false;
                p.moveActions = 2;
                p.destinations = ['topLeft', 'left', 'bottomLeft', 'bottomRight'];
            },
            visuals: [
                { highlights: [Target.bottomRightZone] },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'bottomRight', position } },
        },
        {
            transmission: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.mayUndo = true;
                p.isAnchored = true;
                p.moveActions = 1;
                p.bearings.seaZone = 'bottomRight';
                p.bearings.location = 'temple';
                p.destinations = ['bottomLeft', 'right'];
                p.locationActions = [Action.donate_goods, Action.upgrade_cargo];
            },
            visuals: [
                { highlights: [] },
            ],
            expecting: null,
        },
        { // TEMPLATE!
            transmission: null,
            mutate: (_state: PlayState) => {},
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