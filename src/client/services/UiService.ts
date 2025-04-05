import { PlayerColor, EnrolmentState, ChatEntry, Action, SessionPhase, PlayState } from '../../shared_types';
import { Communicator } from './Communicator';
import localState from '../state';
import { Button } from '../html_behaviors/button';
import { TextInput } from '../html_behaviors/TextInput';
import { ChatInput } from '../html_behaviors/ChatInput';
import { PlayerCountables } from '../../server/server_types';
import clientConstants from '../client_constants';
import { EventName } from '../client_types';

const SINGLE_PLAYER = Boolean(Number(process.env.SINGLE_PLAYER));
class UserInterfaceClass extends Communicator {

    private createButton: Button;
    private joinButton: Button;
    private startButton: Button;
    private resetButton: Button;
    private playerNameInput: TextInput;
    private playerColorSelect;
    private chatMessages: HTMLDivElement;
    private chatInput: ChatInput;
    private chatSendButton: Button;
    private kickPlayerButton: Button;
    private availableSlots: Array<PlayerColor> = ['Green', 'Purple', 'Red', 'Yellow'];
    private sessionPhase: SessionPhase = 'inactive';

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
                Array.from(this.playerColorSelect.element.options).forEach(option => {
                    option.disabled = !this.availableSlots.includes(option.value as PlayerColor);
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

        this.playerNameInput.setValue(localState.playerName);
        this.playerColorSelect.setValue(localState.playerColor);

        this.playerColorSelect.element.addEventListener('change', () => {
            this.playerColorSelect.element.value && this.handleColorSelect();
        });
    }

    public disable(): void {
        this.disableButtons();
        this.disableElements(this.chatInput, this.chatSendButton, this.playerColorSelect, this.playerNameInput);
    }

    private updatePlayerName = (): void => {
        localState.playerName = this.playerNameInput.element.value;
        sessionStorage.setItem('localState', JSON.stringify(localState));
    }

    private sendChatMessage = (): void => {
        const message = this.chatInput.flushValue();

        if (!message || false === !!message.match(/[^\s]/)) return;

        return this.createEvent({
            type: EventName.action,
            detail: {
                action: Action.chat,
                payload: { input: message },
            },
        });
    }

    private handleColorSelect = () => {
        switch(this.sessionPhase) {
            case 'inactive':
                this.createButton.enable();
                break;
            case 'owned':
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

        return this.createEvent({ type: EventName.start, detail: null });
    }

    private processReset = (): void => {

        return this.createEvent({
            type: EventName.action,
            detail: { action: Action.reset , payload: null }
        });
    }

    private processEnroll = (): void => {
        const selectedId = this.playerColorSelect.element.value as PlayerColor;

        if (!selectedId)
            return alert('Select your player color first.');

        if (this.availableSlots.includes(selectedId)) {
            localState.playerColor = selectedId;
            sessionStorage.setItem('localState', JSON.stringify(localState));

            return this.createEvent({
                type: EventName.action,
                detail: { action: Action.enrol, payload: null }
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

    public updateAsEnrolment(state: EnrolmentState): void {
        this.availableSlots = state.availableSlots;
        this.sessionPhase = state.sessionPhase;

        this.updateChat(state.chat);
        this.disableButtons();

        if(localState.playerColor)
            this.enableElements(this.chatInput, this.chatSendButton);

        switch (this.sessionPhase) {
            case 'inactive': this.handleEmptyState(); break;
            case 'owned': this.handleCreatedState(state); break;
            case 'full': this.handleFullState(state); break;
        }
    }
    public updateAsPlay(state: PlayState): void {
        this.availableSlots = state.availableSlots;
        this.sessionPhase = state.sessionPhase;

        this.updateChat(state.chat);
        this.disableButtons();

        if(localState.playerColor)
            this.enableElements(this.chatInput, this.chatSendButton);

        switch (this.sessionPhase) {
            case 'playing': this.handleStartedState(state); break;
            case 'ended': this.handleEndedState(state); break;
        }
    }

    private handleCreatedState(state: EnrolmentState): void {

        // guest/anon/spectator
        if (!localState.playerColor) {
            this.enableElements(this.playerColorSelect, this.playerNameInput);
            this.playerColorSelect.element.value && this.joinButton.enable();

            return this.setInfo('A game is waiting for you');
        }

        // enrolled player
        this.disableElements(this.playerNameInput, this.playerColorSelect)

        // session owner
        if (state.sessionOwner === localState.playerColor) {

            if (state.players.length > 1 || SINGLE_PLAYER) {
                this.enableElements(this.startButton, this.resetButton);

                return this.setInfo('You may start whenever you want!');
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

    private handleFullState(state: EnrolmentState): void {

        this.disableElements(this.playerColorSelect, this.playerNameInput);

        if (!localState.playerColor) {

            return this.setInfo('The game is full, sorry :(');
        }

        if (localState.playerColor === state.sessionOwner) {
            this.enableElements(this.startButton, this.resetButton);

            return this.setInfo('You may start whenever you want');
        }

        return this.setInfo('The game might start at any time.');
    }

    private handleStartedState(state: PlayState): void {

        this.disableElements(this.playerColorSelect, this.playerNameInput);

        if (localState.playerColor) {
            this.setInfo('You are playing.');
        } else {
            this.setInfo('You are spectating.');
        }

        if (localState.playerColor === state.sessionOwner) {
            this.resetButton.enable();
            const activePlayer = state.players.find(p => p.isActive);

            if (activePlayer?.isIdle) {
                this.kickPlayerButton.enable();
            }
        }
    }

    private handleEndedState(state: PlayState): void {

        if (state.isStatusResponse)
            return;

        this.setInfo('The game has ended');
        this.resetButton.enable();
        this.kickPlayerButton.disable();

        setTimeout(() => {
            this.alertGameResults(state.gameResults);
        }, 1000);
    }

    private alertGameResults(gameResults: Array<PlayerCountables>): void {
        sessionStorage.removeItem('playerColor');
        let message = 'The game has ended\n\n';

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

        for (const player of gameResults) {
            message = message.concat(`${player.id} : ${player.vp} VP\n`);
        }

        const vpWinners = getLeaders(gameResults, 'vp');

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

export const UserInterface = new UserInterfaceClass();
