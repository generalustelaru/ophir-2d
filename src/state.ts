
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
        playerShip: null,
        opponentShips: [],
        islands: [],
    },
}

export default state;