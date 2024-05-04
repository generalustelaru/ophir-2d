
import { State } from '../shared_types';

const state: State = {
    localPlayerId: null,
    isBoardDrawn: false,
    server: null,
    konva: {
        localShip: {
            object: null,
            homePosition: { x: 0, y: 0 },
            hoverStatus: null,
        },
        opponentShips: [],
        hexes: [],
    },
}

export default state;