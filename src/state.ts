
import { State } from './types';

const state: State = {
    playerId: null,
    isBoardDrawn: false,
    server: null,
    map: {
        playerShip: {
            object: null,
            homePosition: { x: 0, y: 0 },
            hoverStatus: "",
        },
        opponentShips: [],
        islands: [],
    },
}

export default state;