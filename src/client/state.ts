
import { State } from '../types';

const state: State = {
    localPlayerId: null,
    isBoardDrawn: false,
    server: null,
    konva: {
        localShip: {
            object: null,
            homePosition: { x: 0, y: 0 },
            hoverStatus: "",
        },
        opponentShips: [],
        hexes: [],
    },
}

export default state;