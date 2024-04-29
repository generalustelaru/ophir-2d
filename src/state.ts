
import { State } from './types';

const state: State = {
    playerId: null,
    isBoardDrawn: false,
    server: {
        status: "empty",
        sessionOwner: null,
        availableSlots: ["playerWhite", "playerYellow", "playerRed", "playerGreen"],
        players: {},
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