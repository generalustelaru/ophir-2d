import { Action } from "../shared_types";
import { ServerConstants } from "./server_types"

const serverConstants: ServerConstants = {

    TRADE_DECK_A: [
        { request: ['wood'], reward: { coins: 1, favorAndVp: 1 } },
        { request: ['wood', 'wood'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['wood', 'gems'], reward: { coins: 3, favorAndVp: 2 } },
        { request: ['wood'], reward: { coins: 1, favorAndVp: 1 } },
        { request: ['wood', 'gems', 'cloth'], reward: { coins: 5, favorAndVp: 3 } },
        { request: ['gems'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['gems'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['gems', 'cloth'], reward: { coins: 3, favorAndVp: 2 } },
        { request: ['cloth'], reward: { coins: 1, favorAndVp: 1 } },
        { request: ['gems', 'stone'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['wood', 'stone', 'cloth'], reward: { coins: 4, favorAndVp: 4 } },
        { request: ['wood', 'cloth'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['wood', 'stone'], reward: { coins: 2, favorAndVp: 3 } },
        { request: ['stone'], reward: { coins: 1, favorAndVp: 2 } },
        { request: ['cloth'], reward: { coins: 1, favorAndVp: 1 } },
        { request: ['stone', 'stone'], reward: { coins: 3, favorAndVp: 4 } },
        { request: ['gems', 'gems'], reward: { coins: 4, favorAndVp: 3 } },
        { request: ['stone'], reward: { coins: 1, favorAndVp: 2 } },
        { request: ['stone', 'cloth'], reward: { coins: 2, favorAndVp: 3 } },
        { request: ['wood', 'cloth'], reward: { coins: 2, favorAndVp: 2 } },
    ],
    TRADE_DECK_B: [
        { request: ['wood'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['gems', 'stone', 'cloth'], reward: { coins: 5, favorAndVp: 4 } },
        { request: ['cloth', 'cloth'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['wood', 'gems'], reward: { coins: 4, favorAndVp: 2 } },
        { request: ['wood', 'cloth'], reward: { coins: 2, favorAndVp: 2 } },
        { request: ['stone', 'cloth'], reward: { coins: 2, favorAndVp: 3 } },
        { request: ['wood', 'stone'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['stone'], reward: { coins: 2, favorAndVp: 2 } },
        { request: ['cloth'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['wood', 'wood', 'cloth'], reward: { coins: 5, favorAndVp: 4 } },
        { request: ['gems'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['cloth'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['gems', 'stone'], reward: { coins: 4, favorAndVp: 3 } },
        { request: ['wood', 'stone', 'cloth'], reward: { coins: 4, favorAndVp: 4 } },
        { request: ['wood', 'gems', 'stone'], reward: { coins: 6, favorAndVp: 4 } },
        { request: ['gems', 'gems', 'wood'], reward: { coins: 7, favorAndVp: 4 } },
        { request: ['wood'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['wood', 'wood'], reward: { coins: 4, favorAndVp: 3 } },
        { request: ['gems', 'gems'], reward: { coins: 5, favorAndVp: 3 } },
        { request: ['stone'], reward: { coins: 2, favorAndVp: 2 } },
        { request: ['stone', 'stone'], reward: { coins: 4, favorAndVp: 4 } },
        { request: ['cloth', 'cloth', 'gems'], reward: { coins: 6, favorAndVp: 4 } },
        { request: ['gems', 'cloth'], reward: { coins: 3, favorAndVp: 2 } },
        { request: ['gems'], reward: { coins: 2, favorAndVp: 1 } },
    ],

    DEFAULT_MOVE_RULES: [
        { from: 'center', allowed: ['topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft'], blockedBy: [2, 4, 6, 8, 10, 12] },
        { from: 'topRight', allowed: ['center', 'right', 'topLeft'], blockedBy: [1, 2, 3] },
        { from: 'right', allowed: ['center', 'topRight', 'bottomRight'], blockedBy: [3, 4, 5] },
        { from: 'bottomRight', allowed: ['center', 'right', 'bottomLeft'], blockedBy: [5, 6, 7] },
        { from: 'bottomLeft', allowed: ['center', 'left', 'bottomRight'], blockedBy: [7, 8, 9] },
        { from: 'left', allowed: ['center', 'topLeft', 'bottomLeft'], blockedBy: [9, 10, 11] },
        { from: 'topLeft', allowed: ['center', 'left', 'topRight'], blockedBy: [1, 11, 12] },
    ],

    BARRIER_CHECKS: {
        1: { between: ['topLeft', 'topRight'], incompatible: [1, 11, 12, 2, 3] },
        2: { between: ['topRight', 'center'], incompatible: [1, 2, 3] },
        3: { between: ['topRight', 'right'], incompatible: [1, 2, 3, 4, 5] },
        4: { between: ['right', 'center'], incompatible: [3, 4, 5] },
        5: { between: ['right', 'bottomRight'], incompatible: [3, 4, 5, 6, 7] },
        6: { between: ['bottomRight', 'center'], incompatible: [5, 6, 7] },
        7: { between: ['bottomRight', 'bottomLeft'], incompatible: [5, 6, 7, 8, 9] },
        8: { between: ['bottomLeft', 'center'], incompatible: [7, 8, 9, 10] },
        9: { between: ['bottomLeft', 'left'], incompatible: [7, 8, 9, 10, 11] },
        10: { between: ['left', 'center'], incompatible: [9, 10, 11] },
        11: { between: ['left', 'topLeft'], incompatible: [9, 10, 11, 12, 1] },
        12: { between: ['topLeft', 'center'], incompatible: [11, 12, 1] },
    },

    PLAYER_IDS: [
        'Purple',
        'Yellow',
        'Red',
        'Green',
    ],

    LOCATION_ACTIONS: [
        {name: 'temple', actions: [Action.upgrade_cargo, Action.make_trade, Action.donate_metals]},
        {name: 'market', actions: [Action.make_trade]},
        {name: 'treasury', actions: [Action.buy_metals]},
        {name: 'quary', actions: [Action.load_good]},
        {name: 'forest', actions: [Action.load_good]},
        {name: 'mines', actions: [Action.load_good]},
        {name: 'farms', actions: [Action.load_good]},
    ],

    LOCATION_GOODS: {
        quary: 'stone',
        forest: 'wood',
        mines: 'gems',
        farms: 'cloth',
    },

    DEFAULT_NEW_STATE: {
        gameId: null,
        gameStatus: 'empty',
        sessionOwner: null,
        chat: [],
        availableSlots: [
            'Purple',
            'Yellow',
            'Red',
            'Green',
        ],
        players: [],
    },

    COST_TIERS: [
        {
            templeLevel: 0,
            skipOnPlayerCounts: [2, 3],
            costs: { goldCost: {coins: 2, favor: 5}, silverCost: {coins: 1, favor: 3} },
        },
        {
            templeLevel: 1,
            skipOnPlayerCounts: [],
            costs: { goldCost: {coins: 3, favor: 5}, silverCost: {coins: 1, favor: 3} },
        },
        {
            templeLevel: 2,
            skipOnPlayerCounts: [],
            costs: { goldCost: {coins: 4, favor: 5}, silverCost: {coins: 2, favor: 3} },
        },
        {
            templeLevel: 3,
            skipOnPlayerCounts: [],
            costs: { goldCost: {coins: 5, favor: 5}, silverCost: {coins: 2, favor: 3} },
        },
        {
            templeLevel: 4,
            skipOnPlayerCounts: [],
            costs: { goldCost: {coins: 6, favor: 5}, silverCost: {coins: 3, favor: 3} },
        },
        {
            templeLevel: 5,
            skipOnPlayerCounts: [2],
            costs: { goldCost: {coins: 7, favor: 5}, silverCost: {coins: 4, favor: 3} },
        },
    ],
}

export default serverConstants;