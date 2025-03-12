
import { ClientState } from './client_types';

const state: ClientState = {
    local: {
        gameId: null,
        myId: null,
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
        chat: [],
        availableSlots: [],
        players: [],
        market: null,
        temple: null,
        setup: null,
    },
}

export default state;