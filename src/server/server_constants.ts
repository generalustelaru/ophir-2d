import { ServerConstants } from "./server_types"

const serverConstants: ServerConstants = {

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
        1: { between: ['topLeft', 'topRight'], incompatible: [11, 12, 2, 3] },
        2: { between: ['topRight', 'center'], incompatible: [1, 3] },
        3: { between: ['topRight', 'right'], incompatible: [1, 2, 4, 5] },
        4: { between: ['right', 'center'], incompatible: [3, 5] },
        5: { between: ['right', 'bottomRight'], incompatible: [3, 4, 6, 7] },
        6: { between: ['bottomRight', 'center'], incompatible: [5, 7] },
        7: { between: ['bottomRight', 'bottomLeft'], incompatible: [5, 6, 8, 9] },
        8: { between: ['bottomLeft', 'center'], incompatible: [7, 9, 10] },
        9: { between: ['bottomLeft', 'left'], incompatible: [7, 8, 10, 11] },
        10: { between: ['left', 'center'], incompatible: [9, 11] },
        11: { between: ['left', 'topLeft'], incompatible: [9, 10, 12, 1] },
        12: { between: ['topLeft', 'center'], incompatible: [11, 1] },
    },

    PLAYER_IDS: [
        'playerPurple',
        'playerYellow',
        'playerRed',
        'playerGreen',
    ],

    DEFAULT_PLAYER_STATE: {
        id: 'playerPurple',
        turnOrder: 0,
        isActive: false,
        location: {hexId: "center", position: {x: 0, y: 0}},
        favor: 6,
        hasSpentFavor: false,
        influence: 1,
        allowedMoves: [],
        isAnchored: true,
        allowedSettlementAction: null,
        moveActions: 2,
        cargo: ['empty', 'empty'],
        hasCargo: false,
    },
}

export default serverConstants;