import { PlayerColor, NewState, ChatEntry } from '../../shared_types';

import { Communicator } from './Communicator';
import state from '../state';
import { Button } from '../html_behaviors/button';
import { TextInput } from '../html_behaviors/TextInput';
import { ChatInput } from '../html_behaviors/ChatInput';
import { PlayerCountables } from '../../server/server_types';
import clientConstants from '../client_constants';

class UserInterfaceClass extends Communicator {

    private createButton: Button;
    private joinButton: Button;
    private startButton: Button;
    private resetButton: Button;
    private playerNameInput;
    private playerColorSelect;
    private chatMessages: HTMLDivElement;
    private chatInput: ChatInput;
    private chatSendButton: Button;
    private kickPlayerButton: Button;

    constructor() {
        super();
        this.createButton = new Button('createButton', this.processEnroll);
        this.joinButton = new Button('joinButton', this.processEnroll);
        this.startButton = new Button('startButton', this.processStart);
        this.resetButton = new Button('resetButton', this.processReset);
        this.kickPlayerButton = new Button('kickPlayerButton', ()=>{});
        this.playerNameInput = new TextInput('playerNameInput', this.updatePlayerName);
        this.playerColorSelect = {
            element: document.getElementById('playerColorSelect') as HTMLSelectElement,
            enable: () => {
                this.playerColorSelect.element.disabled = false;
                const players = state.received.players
                Array.from(this.playerColorSelect.element.options).forEach(option => {
                    const player = players.find(player => player.id === option.value);
                    option.disabled = !!player || !option.value;
                });
            },

            setValue: (color: PlayerColor | null) => {
                if (color) this.playerColorSelect.element.value = color;
            },

            disable: () => this.playerColorSelect.element.disabled = true,
        }
        this.chatMessages = document.getElementById('chatMessages') as HTMLDivElement;
        this.chatInput = new ChatInput('chatInput', this.handleKeyInput);
        this.chatSendButton = new Button('chatSendButton', this.sendChatMessage);

        this.playerNameInput.setValue(state.local.playerName);
        this.playerColorSelect.setValue(state.local.playerColor);

        this.playerColorSelect.element.addEventListener('change', () => {
            this.playerColorSelect.element.value && this.handleColorSelect();
        });
    }

    public disable(): void {
        this.disableButtons();
        this.disableElements(this.chatInput, this.chatSendButton, this.playerColorSelect, this.playerNameInput);
    }

    private updatePlayerName = (): void => {
        state.local.playerName = this.playerNameInput.element.value;
        sessionStorage.setItem('localState', JSON.stringify(state.local));
    }

    private sendChatMessage = (): void => {
        const message = this.chatInput.flushValue();

        if (!message || false === !!message.match(/[^\s]/)) return;

        return this.broadcastEvent({
            type: 'action',
            detail: {
                action: 'chat',
                payload: { input: message },
            },
        });
    }

    private handleColorSelect = () => {
        switch(state.received.gameStatus) {
            case 'empty':
                this.createButton.enable();
                break;
            case 'created':
                this.joinButton.enable();
                break;
            default:
                break;
        }
    }
    private handleKeyInput  = (toSubmit: boolean): void => {
        toSubmit && this.sendChatMessage();

        setTimeout(() => {
            this.chatInput.element.focus();
        }, 5);
    }

    private processStart = (): void => {
        this.startButton.disable();

        return this.broadcastEvent({ type: 'start', detail: null });
    }

    private processReset = (): void => {

        return this.broadcastEvent({
            type: 'action',
            detail: { action: 'reset', payload: null }
        });
    }

    private processEnroll = (): void => {
        const lobbyState = state.received as NewState;
        const selectedId = this.playerColorSelect.element.value as PlayerColor;

        if (!selectedId) {
            return alert('Select your player color first.');
        }


        if (lobbyState.availableSlots.includes(selectedId)) {
            state.local.playerColor = selectedId;
            sessionStorage.setItem('localState', JSON.stringify(state.local));

            return this.broadcastEvent({
                type: 'action',
                detail: { action: 'enroll', payload: null }
            });
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

    private disableElements(...handlers: Array<{ disable(): void }>): void {
        handlers.forEach(handler => handler.disable());
    }

    private disableButtons(): void {
        this.createButton.disable();
        this.joinButton.disable();
        this.startButton.disable();
        this.resetButton.disable();
        this.kickPlayerButton.disable();
        this.chatSendButton.disable();
    }

    public updateControls(): void {
        this.updateChat(state.received.sessionChat);
        this.disableButtons();

        if(state.local.playerColor){
            this.enableElements(this.chatInput, this.chatSendButton);
        }

        switch (state.received.gameStatus) {
            case 'empty': this.handleEmptyState(); break;
            case 'created': this.handleCreatedState(); break;
            case 'full': this.handleFullState(); break;
            case 'started': this.handleStartedState(); break;
            case 'ended': this.handleEndedState(); break;
        }
    }

    private handleCreatedState(): void {

        // guest/anon/spectator
        if (!state.local.playerColor) {
            this.enableElements(this.playerColorSelect, this.playerNameInput);
            this.playerColorSelect.element.value && this.joinButton.enable();

            return this.setInfo('A game is waiting for you');
        }

        // enrolled player
        this.disableElements(this.playerNameInput, this.playerColorSelect)

        // session owner
        if (state.received.sessionOwner === state.local.playerColor) {

            if (state.received.players.length > 1) {
                this.enableElements(this.startButton, this.resetButton);

                return this.setInfo('You may start whenever you want');
            }

            return this.setInfo('Waiting for more players to join...');
        }

        return this.setInfo('Waiting for owner to start...');
    }

    private handleEmptyState(): void {
        this.enableElements(this.playerColorSelect, this.playerNameInput);
        this.playerColorSelect.element.value && this.createButton.enable();

        return this.setInfo('You may create the game');
    }

    private handleFullState(): void {

        this.disableElements(this.playerColorSelect, this.playerNameInput);

        if (!state.local.playerColor) {

            return this.setInfo('The game is full, sorry :(');
        }

        if (state.local.playerColor === state.received.sessionOwner) {
            this.enableElements(this.startButton, this.resetButton);

            return this.setInfo('You may start whenever you want');
        }

        return this.setInfo('The game might start at any time.');
    }

    private handleStartedState(): void {

        this.disableElements(this.playerColorSelect, this.playerNameInput);

        if (state.local.playerColor === state.received.sessionOwner) {
            this.resetButton.enable();
            const activePlayer = state.received.players.find(p => p.isActive);

            if (activePlayer?.isIdle) {
                this.kickPlayerButton.enable();
            }
        }
    }

    private handleEndedState(): void {
        if (state.received.isStatusResponse) {
            return;
        }

        this.setInfo('The game has ended');
        this.resetButton.enable();
        this.kickPlayerButton.disable();

        setTimeout(() => {
            this.alertGameResults();
        }, 1000);
    }

    private alertGameResults(): void {
        sessionStorage.removeItem('playerColor');
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

    private updateChat(chat: Array<ChatEntry>): void {
        this.chatMessages.innerHTML = chat.map(entry => {
            const name = entry.name ? `${entry.name}: ` : '';
            const message = entry.message;
            const color = entry.id ? clientConstants.COLOR[entry.id] : 'white';
            return `<span style="color:${color}; font-weight: bold">${name}</span>${message}</br>`;
        }).join('');
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

export const UserInterfaceService = new UserInterfaceClass();
