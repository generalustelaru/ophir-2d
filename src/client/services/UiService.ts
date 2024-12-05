import { PlayerId, NewState, GameSetupRequest } from '../../shared_types';
import { WsPayload } from '../../shared_types';
import { Service } from './Service';
import state from '../state';
import { Button } from '../html_behaviors/button';
import { TextInput } from '../html_behaviors/TextInput';
import { CanvasService } from "./CanvasService";
import { PlayerCountables } from '../../server/server_types';

export class UserInterfaceService extends Service {

    private createButton: Button;
    private joinButton: Button;
    private startButton: Button;
    private resetButton: Button;
    private playerNameInput;
    private playerColorSelect;
    private chatInput: TextInput;
    private chatSendButton: Button;

    constructor() {
        super();
        this.createButton = new Button('createButton', this.processEnroll);
        this.joinButton = new Button('joinButton', this.processEnroll);
        this.startButton = new Button('startButton', this.processStart);
        this.resetButton = new Button('resetButton', this.processReset);
        this.playerNameInput = new TextInput('playerNameInput', this.updatePlayerName);
        this.playerColorSelect = {
            element: document.getElementById('playerColorSelect') as HTMLSelectElement,
            enable: () => {
                this.playerColorSelect.element.disabled = false;
                const players = state.received.players
                Array.from(this.playerColorSelect.element.options).forEach(option => {
                    const player = players.find(player => player.id === option.value);
                    option.disabled = !!player;
                });
            },

            setValue: (color: PlayerId | null) => {
                if (color) this.playerColorSelect.element.value = color;
            },

            disable: () => this.playerColorSelect.element.disabled = true,
        }
        this.chatInput = new TextInput('chatInput', () => {});
        this.chatSendButton = new Button('chatSendButton', () => {});

        this.playerNameInput.setValue(state.local.playerName);
        this.playerColorSelect.setValue(state.local.playerId);
    }

    private updatePlayerName = (): void => {
        state.local.playerName = this.playerNameInput.element.value;
        sessionStorage.setItem('localState', JSON.stringify(state.local));
    }

    private processStart = (): void => {

        if (state.received.players.length < 2) {
            return alert('You need at least 2 players to start the game');
        }

        this.startButton.disable();
        const canvasService: CanvasService = CanvasService.getInstance([]);
        const payload: GameSetupRequest = {
            action: 'start',
            details: canvasService.getSetupCoordinates(),
        };

        return this.broadcastEvent('action', payload);
    }

    private processReset = (): void => {
        const payload: WsPayload = { action: 'reset', details: null };

        return this.broadcastEvent('action', payload);
    }

    private processEnroll = (): void => {
        const lobbyState = state.received as NewState;
        const selectedId = this.playerColorSelect.element.value as PlayerId;

        if (!selectedId) {
            return alert('Select your player color first.');
        }


        if (lobbyState.availableSlots.includes(selectedId)) {
            state.local.playerId = selectedId;
            sessionStorage.setItem('localState', JSON.stringify(state.local));
            const payload: WsPayload = { action: 'enroll', details: null };

            return this.broadcastEvent('action', payload);
        }

        return this.setInfo('This color has just been taken :(');
    }

    public setInfo(text: string): void {
        const info = document.getElementById('info') as HTMLDivElement;
        info.innerHTML = text;
    }

    private enableElements(...handlers: Array<{ enable(): void }>): void {
        handlers.forEach(handler => handler.enable());
    }

    public disableControls(): void {
        this.createButton.disable();
        this.joinButton.disable();
        this.startButton.disable();
        this.playerColorSelect.disable();
        this.resetButton.disable();
        this.playerNameInput.disable();
        this.chatInput.disable();
        this.chatSendButton.disable();
    }

    public updateControls(): void {
        this.disableControls();

        if(state.local.playerId){
            this.enableElements(this.chatInput, this.chatSendButton);
        }

        switch (state.received.gameStatus) {
            case 'empty': this.enableCreate(); break;
            case 'created': this.enableJoinOrStart(); break;
            case 'full': this.enableStartForOwner(); break;
            case 'started': this.enableResetForOwner(); break;
            case 'ended': {
                this.setInfo('The game has ended');
                this.enableResetForOwner();
                this.alertGameResults();
            } break;
        }
    }

    private enableJoinOrStart(): void {

        if (!state.local.playerId) {
            this.enableElements(this.joinButton, this.playerColorSelect, this.playerNameInput);

            return this.setInfo('A game is waiting for you');
        }

        if (state.received.sessionOwner === state.local.playerId) {
            this.enableElements(this.startButton, this.resetButton)

            return this.setInfo('Waiting for more players to join...');
        }

        return this.setInfo('Waiting for owner to start...');
    }

    private enableCreate(): void {
        this.enableElements(this.createButton, this.playerColorSelect, this.playerNameInput);

        return this.setInfo('You may create the game');
    }

    private enableStartForOwner(): void {

        if (!state.local.playerId) {
            return this.setInfo('The game is full, sorry :(');
        }

        if (state.local.playerId === state.received.sessionOwner) {
            this.startButton.enable();

            return this.setInfo('You may start whenever you want');
        }

        return this.setInfo('The game might start at any time.');
    }

    private enableResetForOwner(): void {

        if (state.local.playerId === state.received.sessionOwner) {
            this.resetButton.enable();
        }
    }

    private alertGameResults(): void {
        sessionStorage.removeItem('playerId');
        const results = state.received.gameResults;
        let message = 'The game has ended\n\n';

        if (!results){
            return alert(message);
        }

        const getLeaders = (tiedPlayers: Array<PlayerCountables>, criteria: string) : Array<PlayerCountables> => {
            const key = criteria as keyof typeof tiedPlayers[0];
            const topValue = tiedPlayers.reduce((acc, player) => {
                const value = player[key] as number;

                return value > acc ? value : acc
            }, 0);

            return tiedPlayers.filter(player => player[key] === topValue);
        }
        const addWinner = (winnerAsArray: Array<PlayerCountables>, criteria: string, message: string) : string => {
            const winner = winnerAsArray[0];
            const key = criteria as keyof typeof winner;

            return message.concat(`\nThe winner is ${winner.id} with ${winner[key]} ${criteria}\n`);
        }
        const addTiedPlayers = (players: Array<PlayerCountables>, criteria: string, message: string) : string => {
            const key = criteria as keyof typeof players[0];

            return message.concat(
                `\n${criteria}-tied players:\n\n${players.map(
                    player => `${player.id} : ${player[key]} ${criteria}\n`
                ).join('')}`
            );
        }

        for (const player of results) {
            message = message.concat(`${player.id} : ${player.vp} VP\n`);
        }

        const vpWinners = getLeaders(results, 'vp');

        if (vpWinners.length == 1){
            return alert(addWinner(vpWinners, 'vp', message));
        }

        message = addTiedPlayers(vpWinners, 'favor', message);
        const favorWinners = getLeaders(vpWinners, 'favor');

        if (favorWinners.length == 1){
            return alert(addWinner(favorWinners, 'favor', message));
        }

        message = addTiedPlayers(favorWinners, 'coins', message);
        const coinWinners = getLeaders(favorWinners, 'coins');

        if (coinWinners.length == 1) {
            return alert(addWinner(coinWinners, 'coins', message));
        }

        message = message.concat(`\nShared victory:\n`);

        for (const player of coinWinners) {
            message = message.concat(`${player.id} : ${player.vp} VP + ${player.coins} coins\n`);
        }

        alert(message);
    }
}
