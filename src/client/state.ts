
import { ClientState } from './client_types';

const state: ClientState = {
    local: {
        gameId: null,
        clientId: null,
        playerColor: null,
        playerName: null,
        isBoardDrawn: false,
    },
    received: {
        isStatusResponse: false,
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