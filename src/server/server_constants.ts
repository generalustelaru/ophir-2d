import { ServerConstants } from "./server_types"

const serverConstants: ServerConstants = {

    TRADE_DECK_A: [
        { request: ['wood'], reward: { coins: 1, favorAndVp: 1 } },
        { request: ['wood', 'wood'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['wood', 'gem'], reward: { coins: 3, favorAndVp: 2 } },
        { request: ['wood'], reward: { coins: 1, favorAndVp: 1 } },
        { request: ['wood', 'gem', 'cloth'], reward: { coins: 5, favorAndVp: 3 } },
        { request: ['gem'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['gem'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['gem', 'cloth'], reward: { coins: 3, favorAndVp: 2 } },
        { request: ['cloth'], reward: { coins: 1, favorAndVp: 1 } },
        { request: ['gem', 'stone'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['wood', 'stone', 'cloth'], reward: { coins: 4, favorAndVp: 4 } },
        { request: ['wood', 'cloth'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['wood', 'stone'], reward: { coins: 2, favorAndVp: 3 } },
        { request: ['stone'], reward: { coins: 1, favorAndVp: 2 } },
        { request: ['cloth'], reward: { coins: 1, favorAndVp: 1 } },
        { request: ['stone', 'stone'], reward: { coins: 3, favorAndVp: 4 } },
        { request: ['gem', 'gem'], reward: { coins: 4, favorAndVp: 3 } },
        { request: ['stone'], reward: { coins: 1, favorAndVp: 2 } },
        { request: ['stone', 'cloth'], reward: { coins: 2, favorAndVp: 3 } },
        { request: ['wood', 'cloth'], reward: { coins: 2, favorAndVp: 2 } },
    ],
    TRADE_DECK_B: [
        { request: ['wood'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['gem', 'stone', 'cloth'], reward: { coins: 5, favorAndVp: 4 } },
        { request: ['cloth', 'cloth'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['wood', 'gem'], reward: { coins: 4, favorAndVp: 2 } },
        { request: ['wood', 'cloth'], reward: { coins: 2, favorAndVp: 2 } },
        { request: ['stone', 'cloth'], reward: { coins: 2, favorAndVp: 3 } },
        { request: ['wood', 'stone'], reward: { coins: 3, favorAndVp: 3 } },
        { request: ['stone'], reward: { coins: 2, favorAndVp: 2 } },
        { request: ['cloth'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['wood', 'wood', 'cloth'], reward: { coins: 5, favorAndVp: 4 } },
        { request: ['gem'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['cloth'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['gem', 'stone'], reward: { coins: 4, favorAndVp: 3 } },
        { request: ['wood', 'stone', 'cloth'], reward: { coins: 4, favorAndVp: 4 } },
        { request: ['wood', 'gem', 'stone'], reward: { coins: 6, favorAndVp: 4 } },
        { request: ['gem', 'gem', 'wood'], reward: { coins: 7, favorAndVp: 4 } },
        { request: ['wood'], reward: { coins: 2, favorAndVp: 1 } },
        { request: ['wood', 'wood'], reward: { coins: 4, favorAndVp: 3 } },
        { request: ['gem', 'gem'], reward: { coins: 5, favorAndVp: 3 } },
        { request: ['stone'], reward: { coins: 2, favorAndVp: 2 } },
        { request: ['stone', 'stone'], reward: { coins: 4, favorAndVp: 4 } },
        { request: ['cloth', 'cloth', 'gem'], reward: { coins: 6, favorAndVp: 4 } },
        { request: ['gem', 'cloth'], reward: { coins: 3, favorAndVp: 2 } },
        { request: ['gem'], reward: { coins: 2, favorAndVp: 1 } },
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
        'playerPurple',
        'playerYellow',
        'playerRed',
        'playerGreen',
    ],

    LOCATION_ACTIONS: [
        {id: 'temple', actions: ['upgrade_hold', 'donate_goods', 'donate_metals']},
        {id: 'market', actions: ['sell_goods']},
        {id: 'treasury', actions: ['buy_metals']},
        {id: 'quary', actions: ['pickup_good']},
        {id: 'forest', actions: ['pickup_good']},
        {id: 'mines', actions: ['pickup_good']},
        {id: 'farms', actions: ['pickup_good']},
    ],

    LOCATION_GOODS: {
        quary: 'stone',
        forest: 'wood',
        mines: 'gem',
        farms: 'cloth',
    },

    DEFAULT_PLAYER_STATE: {
        id: 'playerPurple',
        turnOrder: 0,
        isActive: false,
        hexagon: { hexId: "center", position: {x: 0, y: 0} },
        favor: 2,
        privilegedSailing: false,
        influence: 1,
        allowedMoves: [],
        isAnchored: true,
        locationActions: null,
        moveActions: 2,
        hasCargo: false,
        cargo: ['empty', 'empty'],
        feasibleTrades: [],
        coins: 0,
    },

    NEW_STATE: {
        gameStatus: 'empty',
        gameResults: null,
        sessionOwner: null,
        availableSlots: [
            'playerPurple',
            'playerYellow',
            'playerRed',
            'playerGreen',
        ],
        players: [],
        marketOffer: null,
        setup: null,
    },

    TEMPLE_LEVELS: [
        { id: 0, goldCost: {coins: 2, favor: 5}, silverCost: {coins: 1, favor: 3}, skipOnPlayerCount: 4 },
        { id: 1, goldCost: {coins: 3, favor: 5}, silverCost: {coins: 1, favor: 3}, skipOnPlayerCount: null },
        { id: 2, goldCost: {coins: 4, favor: 5}, silverCost: {coins: 2, favor: 3}, skipOnPlayerCount: null },
        { id: 3, goldCost: {coins: 5, favor: 5}, silverCost: {coins: 2, favor: 3}, skipOnPlayerCount: null },
        { id: 4, goldCost: {coins: 6, favor: 5}, silverCost: {coins: 3, favor: 3}, skipOnPlayerCount: null },
        { id: 5, goldCost: {coins: 7, favor: 5}, silverCost: {coins: 4, favor: 3}, skipOnPlayerCount: 2 },
        { id: 6, goldCost: {coins: 7, favor: 5}, silverCost: {coins: 4, favor: 3}, skipOnPlayerCount: null },
    ],
}

export default serverConstants;