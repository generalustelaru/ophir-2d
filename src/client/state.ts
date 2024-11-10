
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
}

export default clientState;