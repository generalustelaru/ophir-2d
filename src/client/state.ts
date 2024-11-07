
import { ClientState } from './client_types';

const clientState: ClientState = {
    localPlayerId: null,
    isBoardDrawn: false,
    sharedState: {
        gameStatus: 'empty',
        sessionOwner: null,
        availableSlots: [],
        players: null,
        setup: null,
    },
    konva: {
        localShip: {
            object: null,
            homePosition: { x: 0, y: 0 },
            isDestinationValid: false,
        },
        localCargoHold: null,
        opponentShips: [],
        hexes: [],
    },
}

export default clientState;