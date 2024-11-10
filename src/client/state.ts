
import { ClientState } from './client_types';

const clientState: ClientState = {
    localPlayerId: null,
    isBoardDrawn: false,
    received: {
        gameStatus: 'empty',
        sessionOwner: null,
        availableSlots: [],
        players: [],
        setup: null,
    },
    konva: { // TODO: store these objects inside their group/object classes to reduce state clutter.
        localShip: {
            object: null,
            homePosition: { x: 0, y: 0 },
            isDestinationValid: false,
        },
        playMats: [],
        opponentShips: [],
        hexes: [],
    },
}

export default clientState;