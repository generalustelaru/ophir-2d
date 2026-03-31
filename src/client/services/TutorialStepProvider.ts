import { PlayState, Action, ZoneName } from '~/shared_types';
import { ScenarioStepPartial, Target } from '../client_types';

const position = { x: 0, y: 0 } as const;
export class TutorialStepProvider {
    private currentStep: number = 0;
    private partials: Array<Omit<ScenarioStepPartial, 'index'>> = [
        {
            laconic: null,
            mutate: () => { },
            visuals: [
                { highlights: [] },
                { highlights: [Target.mapGroup] },
                { highlights: [Target.centerZone] },
                { highlights: [Target.bottomRightZone, Target.templeArea] },
                { highlights: [Target.movesCounter] },
                { highlights: [Target.movesCounter, Target.topLeftZone] },
            ],
            expecting: [{ action: Action.move, payload: { zoneId: 'topLeft', position } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.bearings.seaZone = 'topLeft';
                p.bearings.location = 'forest';
                p.moveActions = 1;
                p.mayUndo = true;
                p.isAnchored = true;
                p.locationActions = [Action.load_commodity];
                p.destinations = ['left', 'topRight'];
            },
            visuals: [
                { highlights: [Target.centerZone] },
                { highlights: [Target.topRightZone, Target.marketArea] },
                { highlights: [Target.topLeftZone] },
                { highlights: [Target.topLeftZone] },
            ],
            expecting: [{ action: Action.load_commodity, payload: { commodity: 'gems', drop: null } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.moveActions = 0;
                p.cargo = ['gems', 'empty'];
                p.locationActions = [];
            },
            visuals: [
                { highlights: [Target.cargoBand] },
                { highlights: [Target.movesCounter] },
                { highlights: [Target.topLeftZone] },
                { highlights: [Target.endTurnButton] },
            ],
            expecting: [{ action: Action.end_turn , payload: null }],
        },
        {
            laconic: 'turnStart',
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
                { highlights: [Target.rivalPlacard] },
                { highlights: [Target.topRightZone, Target.rivalInfluence] },
            ],
            expecting: [{ action: Action.move, payload: { zoneId: 'topRight', position } }],
        },
        {
            laconic: null,
            influenceRollDetail: { color: 'Purple', rolled: 2, toHit: 3 },
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
            expecting: [{ action: Action.move, payload: { zoneId: 'topRight', position } }],
        },
        {
            laconic: 'rivalControl',
            influenceRollDetail: { color: 'Purple', rolled: 6, toHit: 2 },
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
                { highlights: [Target.rivalPlacard] },
                { highlights: [Target.rivalMoves] },
                { highlights: [Target.rightZone] },
            ],
            expecting: [{ action: Action.move_rival, payload: { zoneId: 'right', position } }],
        },
        {
            laconic: null,
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
            expecting: [{ action: Action.end_rival_turn, payload: null }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                if(state.rival.isIncluded) {
                    const r = state.rival;
                    r.isControllable = false;
                    r.influence = 6;
                    r.moves = 2;
                }
                const p = state.players[0];
                p.isHandlingRival = false;
                p.locationActions = [Action.trade_commodities, Action.sell_specialty];
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
            expecting: [{ action: Action.sell_specialty, payload: null }],
        },
        {
            laconic: null,
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
            expecting: [{ action: Action.undo, payload: null }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.cargo = ['gems', 'empty'];
                p.coins = 0;
                p.mayUndo = false;
                p.locationActions = [Action.trade_commodities, Action.sell_specialty];
            },
            visuals: [
                { highlights: [] },
                { highlights: [Target.slot_3] },
            ],
            expecting: [{ action: Action.trade_commodities, payload: { slot: 'slot_3' } }],
        },
        {
            laconic: null,
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
                m.future = { request: ['gems','linen'], reward: { coins: 3, favorAndVp: 2 } };
            },
            visuals: [
                { highlights: [Target.coinDial] },
                { highlights: [Target.marketArea, Target.slot_3] },
                { highlights: [Target.marketArea] },
                { highlights: [Target.marketArea] },
                { highlights: [Target.fluctuation_up, Target.fluctuation_down, Target.temple_mark] },
                { highlights: [Target.fluctuation_up] },
                { highlights: [Target.fluctuation_down] },
                { highlights: [Target.fluctuation_up, Target.fluctuation_down] },
                { highlights: [Target.temple_mark] },
                { highlights: [Target.endTurnButton] },
            ],
            expecting: [{ action: Action.end_turn, payload: null }],
        },
        {
            laconic: 'turnStart',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.isAnchored = false;
                p.moveActions = 2;
                p.destinations = ['right', 'topLeft'];
            },
            visuals: [
                { highlights: [Target.rightZone, Target.treasuryArea] },
                { highlights: [Target.rightZone, Target.rivalInfluence] },
                { highlights: [Target.rivalInfluence] },
                { highlights: [Target.favorDial, Target.cargoBand] },
                { highlights: [Target.bottomRightZone, Target.templeArea] },
                { highlights: [Target.centerZone] },
            ],
            expecting: [{ action: Action.move, payload: { zoneId: 'topLeft', position } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.isAnchored = true;
                p.moveActions = 1;
                p.bearings.seaZone = 'topLeft';
                p.bearings.location = 'mines';
                p.destinations = ['left', 'center'];
                p.mayUndo = true;
                p.locationActions = [Action.load_commodity];
            },
            visuals: [
                { highlights: [Target.centerZone] },
            ],
            expecting: [{ action: Action.move, payload : { zoneId: 'center', position } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState)=> {
                const p = state.players[0];
                p.moveActions = 0;
                p.bearings.seaZone = 'center';
                p.bearings.location = 'farms';
            },
            visuals: [
                { highlights: [Target.templeMarketCard] },
                { highlights: [] },
            ],
            expecting: [{ action: Action.load_commodity, payload: { commodity: 'linen', drop: null } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.moveActions = 0;
                p.cargo = ['linen', 'empty'];
                p.mayUndo = true;
                p.locationActions = [];
            },
            visuals: [
                { highlights: [] },
            ],
            expecting: [{ action: Action.end_turn, payload: null }],
        },
        {
            laconic: 'turnStart',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.isAnchored = false;
                p.mayUndo = false;
                p.moveActions = 2;
                p.destinations = ['topLeft', 'left', 'bottomLeft', 'bottomRight'];
            },
            visuals: [
                { highlights: [Target.leftZone] },
            ],
            expecting: [{ action: Action.move, payload: { zoneId: 'left', position } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.moveActions = 1;
                p.bearings.seaZone = 'left';
                p.bearings.location = 'forest';
                p.destinations = ['topLeft', 'bottomLeft'];
                p.mayUndo = true;
                p.isAnchored = true;
                p.locationActions = [Action.load_commodity];
            },
            visuals: [
                { highlights: [] },
            ],
            expecting: [{ action: Action.load_commodity, payload: { commodity: 'ebony', drop: null } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.moveActions = 0;
                p.locationActions = [];
                p.cargo = ['linen', 'ebony'];
            },
            visuals: [
                { highlights: [Target.cargoBand] },
            ],
            expecting: [{ action: Action.end_turn, payload: null }],
        },
        {
            laconic: 'turnStart',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.mayUndo = false;
                p.isAnchored = false;
                p.moveActions = 2;
                p.destinations = ['topLeft', 'center', 'bottomLeft'];
            },
            visuals: [
                { highlights: [Target.bottomRightZone] },
            ],
            expecting: [
                { action: Action.move, payload: { zoneId: 'center', position } },
                { action: Action.move, payload: { zoneId: 'bottomLeft', position } },
            ],
        },
        {
            laconic: null,
            mutate: (state: PlayState, zone?: ZoneName) => {
                if (!zone) return;
                const p = state.players[0];
                p.mayUndo = true;
                p.isAnchored = true;
                p.moveActions = 1;
                p.bearings.seaZone = zone;
                p.bearings.location = zone == 'center' ? 'farms' : 'quarry';
                p.destinations = zone == 'center' ? ['topLeft','bottomLeft','bottomRight'] : ['center','bottomRight'];
                p.locationActions = [Action.load_commodity];
            },
            visuals: [
                { highlights: [Target.bottomRightZone] },
            ],
            expecting: [{ action: Action.move, payload: { zoneId: 'bottomRight', position } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.mayUndo = true;
                p.isAnchored = true;
                p.moveActions = 0;
                p.bearings.seaZone = 'bottomRight';
                p.bearings.location = 'temple';
                p.destinations = ['bottomLeft', 'right'];
                p.locationActions = [Action.donate_commodities, Action.upgrade_cargo];
                p.feasibleTrades = [{ slot: 'slot_2', missing: [] }];
            },
            visuals: [
                { highlights: [Target.templeArea] },
                { highlights: [Target.templeMarketCard, Target.temple_mark] },
                { highlights: [Target.templeMarketCard] },
            ],
            expecting: [{ action: Action.donate_commodities, payload: { slot: 'slot_2' } }],
        },
        {
            laconic: null,
            vpDetail: { vp: 2 },
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.favor = 2;
                p.moveActions = 0;
                p.cargo = ['empty', 'empty'];
                p.locationActions = [Action.upgrade_cargo];
                p.mayUndo = false;
                const m = state.market;
                m.deckSize -= 1;
                m.slot_3 = m.slot_2;
                m.slot_2 = m.slot_1;
                m.slot_1 = m.future;
                m.future = { request: ['ebony', 'marble', 'linen'], reward: { coins: 4, favorAndVp: 4 } };
            },
            visuals: [
                { highlights: [Target.favorDial, Target.vpDial] },
                { highlights: [Target.marketArea, Target.treasuryArea, Target.templeMarketCard] },
                { highlights: [Target.deck] },
                { highlights: [Target.upgradeButton] },
            ],
            expecting: [{ action: Action.upgrade_cargo, payload: null }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.cargo.push('empty');
                p.coins -= 2;
                p.locationActions = [];
                p.mayUndo = true;
            },
            visuals: [
                { highlights: [Target.cargoBand] },
            ],
            expecting: [{ action: Action.end_turn, payload: null }],
        },
        {
            laconic: 'turnStart',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.mayUndo = false;
                p.isAnchored = false;
                p.moveActions = 2;
                p.destinations = ['bottomLeft', 'center', 'right'];
            },
            visuals: [
                { highlights: [Target.rightZone] },
                { highlights: [Target.favorButton] },
            ],
            expecting: [{ action: Action.spend_favor, payload: null }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.privilegedSailing = true;
                p.isAnchored = true;
                p.favor -= 1;
            },
            visuals: [
                { highlights: [Target.rightZone] },
            ],
            expecting: [{ action: Action.move, payload: { zoneId: 'right', position } }],
        },
        {
            laconic: 'rivalControl',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.moveActions = 1;
                p.bearings.seaZone = 'right';
                p.bearings.location = 'treasury';
                p.isHandlingRival = true;
                p.destinations = ['topRight'];
                p.feasiblePurchases = [{ metal: 'silver', currency: 'coins' }];
                if (state.rival.isIncluded) {
                    const r = state.rival;
                    r.isControllable = true;
                    r.destinations = ['topRight', 'bottomRight'];
                }
            },
            visuals: [
                { highlights: [Target.influenceDie] },
                { highlights: [Target.topRightZone] },
            ],
            expecting: [{ action: Action.move_rival, payload: { zoneId: 'topRight', position } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                if (state.rival.isIncluded) {
                    const r = state.rival;
                    r.bearings.seaZone = 'topRight';
                    r.bearings.location = 'market';
                    r.destinations = ['topLeft'];
                    r.moves = 1;
                }
            },
            visuals: [
                { highlights: [Target.cycleMarket, Target.marketArea] },
            ],
            expecting: [{ action: Action.shift_market, payload: null }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const m = state.market;
                m.deckSize -= 1;
                m.slot_3 = m.slot_2;
                m.slot_2 = m.slot_1;
                m.slot_1 = m.future;
                m.future = { request: ['ebony'], reward: { coins: 1, favorAndVp: 1 } };
                if (state.rival.isIncluded) {
                    const r = state.rival;
                    r.influence = 4;
                    r.isControllable = false;
                }
                const p = state.players[0];
                p.isHandlingRival = false;
                p.locationActions = [Action.buy_metal];
            },
            visuals: [
                { highlights: [Target.marketArea] },
                { highlights: [Target.deck] },
                { highlights: [Target.silverForCoin] },
            ],
            expecting: [{ action: Action.buy_metal, payload: { metal: 'silver', currency: 'coins', drop: null } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.mayUndo = true;
                p.moveActions = 0;
                p.coins = 0;
                p.cargo = ['silver', 'silver_extra', 'empty'];
                p.feasiblePurchases = [];
                p.locationActions = [];
                p.destinations = [];
            },
            visuals: [
                { highlights: [Target.cargoBand] },
                { highlights: [Target.donationsDisplay] },
                { highlights: [] },
            ],
            expecting: [{ action: Action.end_turn, payload: null }],
        },
        {
            laconic: 'turnStart',
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.privilegedSailing = false;
                p.isAnchored = false;
                p.mayUndo = false;
                p.moveActions = 2;
                p.destinations = ['topRight', 'bottomRight'];
                state.temple.donations = ['gold', 'silver'];
            },
            visuals: [
                { highlights: [] },
            ],
            expecting: [{ action: Action.move, payload: { zoneId: 'bottomRight', position } }],
        },
        {
            laconic: null,
            mutate: (state: PlayState) => {
                const p = state.players[0];
                p.mayUndo = true;
                p.moveActions = 1;
                p.bearings.seaZone = 'bottomRight';
                p.bearings.location = 'temple';
                p.destinations = ['bottomLeft', 'center'];
                p.isAnchored = true;
                p.locationActions = [Action.donate_metal];
            },
            visuals: [
                { highlights: [Target.donationsDisplay] },
                { highlights: [Target.donationsDisplay, Target.goldForCoin, Target.silverForCoin] },
                { highlights: [Target.silverCard, Target.goldForCoin, Target.silverForCoin] },
            ],
            expecting: [{ action: Action.donate_metal, payload: { metal: 'silver' } }],
        },
        {
            laconic: null,
            vpDetail: { vp: 7 },
            mutate: (state: PlayState) => {
                state.temple.donations.push('silver');
                state.temple.currentLevel += 1;
                state.treasury.goldCost.coins += 1;
                state.treasury.silverCost.coins += 1;
                const p = state.players[0];
                p.cargo = ['empty', 'empty', 'empty'];
                p.moveActions = 0;
                p.locationActions = [];

            },
            visuals: [
                { highlights: [Target.goldForCoin, Target.silverForCoin] },
                { highlights: [Target.vpDial] },
                { highlights: [Target.bottomRightZone] },
                { highlights: [] },
                { highlights: [] },
            ],
            expecting: null,
        },
    ];

    public getNextPartial(): ScenarioStepPartial {
        return { ...this.partials[this.currentStep], index: this.currentStep++ };
    }
}