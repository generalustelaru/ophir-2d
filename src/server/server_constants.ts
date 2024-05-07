import { ServerConstants } from "./server_types"

const serverConstants: ServerConstants = {
    WS_SIGNAL: {
        connection: 'connection',
        message: 'message',
        close: 'close',
    },

    DEFAULT_MOVE_RULES: [ //  DefaultMoveRule[]
        { from: 'center', allowed: ['topRight', 'right', 'bottomRight', 'bottomLeft', 'left', 'topLeft'], blockedBy: [2, 4, 6, 8, 10, 12] },
        { from: 'topRight', allowed: ['center', 'right', 'topLeft'], blockedBy: [1, 2, 3] },
        { from: 'right', allowed: ['center', 'topRight', 'bottomRight'], blockedBy: [3, 4, 5] },
        { from: 'bottomRight', allowed: ['center', 'right', 'bottomLeft'], blockedBy: [5, 6, 7] },
        { from: 'bottomLeft', allowed: ['center', 'left', 'bottomRight'], blockedBy: [7, 8, 9] },
        { from: 'left', allowed: ['center', 'topLeft', 'bottomLeft'], blockedBy: [9, 10, 11] },
        { from: 'topLeft', allowed: ['center', 'left', 'topRight'], blockedBy: [1, 11, 12] },
    ],

    BARRIER_CHECKS: { // BarrierChecks
        1: { between: ['topLeft', 'topRight'], incompatible: [11, 12, 2, 3] },
        2: { between: ['topRight', 'center'], incompatible: [12, 1, 3, 4] },
        3: { between: ['topRight', 'right'], incompatible: [1, 2, 4, 5] },
        4: { between: ['right', 'center'], incompatible: [2, 3, 5, 6] },
        5: { between: ['right', 'bottomRight'], incompatible: [3, 4, 6, 7] },
        6: { between: ['bottomRight', 'center'], incompatible: [4, 5, 7, 8] },
        7: { between: ['bottomRight', 'bottomLeft'], incompatible: [5, 6, 8, 9] },
        8: { between: ['bottomLeft', 'center'], incompatible: [6, 7, 9, 10] },
        9: { between: ['bottomLeft', 'left'], incompatible: [7, 8, 10, 11] },
        10: { between: ['left', 'center'], incompatible: [8, 9, 11, 12] },
        11: { between: ['left', 'topLeft'], incompatible: [9, 10, 12, 1] },
        12: { between: ['topLeft', 'center'], incompatible: [10, 11, 1, 2] },
    },

    PLAYER_IDS: [ //  PlayerId[]
        'playerPurple',
        'playerYellow',
        'playerRed',
        'playerGreen',
    ],

    // TODO: Implement Influence logic (rolling d6 on moving to an occupied hex). Will require keeping track of last position and plauers' current influence in state.
    PLAYER_STATE: { //PlayerState
        turnOrder: null,
        isActive: false,
        location: null,
        influence: 1,
        allowedMoves: null,
        isAnchored: true,
        moveActions: 2,
    },
}

export default serverConstants;