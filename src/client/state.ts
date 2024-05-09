
import { ClientState } from './client_types';

const state: ClientState = {
    localPlayerId: null,
    isBoardDrawn: false,
    server: null,
    konva: {
        localShip: {
            object: null,
            homePosition: { x: 0, y: 0 },
            isDestinationValid: null,
        },
        opponentShips: [],
        hexes: [],
    },
}

export default state;