
import { ClientState } from './client_types';

const clientState: ClientState = {
    localPlayerId: null,
    isBoardDrawn: false,
    received: {
        gameStatus: 'empty',
        gameResults: null,
        sessionOwner: null,
        availableSlots: [],
        players: [],
        marketOffer: null,
        setup: null,
    },
}

export default clientState;