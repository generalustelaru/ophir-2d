
import { State } from './types';

const state: State = {
    playerId: null,
    isBoardDrawn: false,
    server: {
        status: "empty",
        sessionOwner: null,
        availableSlots: ["playerWhite", "playerYellow", "playerRed", "playerGreen"],
        players: {
            playerWhite: null,
            playerYellow: null,
            playerRed: null,
            playerGreen: null,
        },
    },
    map: {
        playerShip: {
            element: null,
            homePosition: { x: 0, y: 0 },
            hoverStatus: "",
        },
        opponentShips: [],
        islands: [],
    },
}

export default state;