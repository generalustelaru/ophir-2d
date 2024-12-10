
import { ClientState } from './client_types';

const state: ClientState = {
    local: {
        playerId: null,
        playerName: null,
        isBoardDrawn: false,
    },
    received: {
        gameId: null,
        gameStatus: 'empty',
        gameResults: null,
        sessionOwner: null,
        sessionChat: [],
        availableSlots: [],
        players: [],
        marketOffer: null,
        templeStatus: null,
        setup: null,
    },
}

export default state;