import { PlayerColor, EnrolmentState, ChatEntry, Action, PlayState, SetupState } from "~/shared_types";
import { Communicator } from './Communicator';
import localState from '../state';
import { Button } from '../html_behaviors/button';
import { ChatInput } from '../html_behaviors/ChatInput';
import { PlayerCountables } from "~/server_types";
import clientConstants from "~/client_constants";
import { EventType } from "~/client_types";

const SINGLE_PLAYER = Boolean(Number(process.env.SINGLE_PLAYER));
export const UserInterface = new class extends Communicator {

    private draftButton: Button;
    private startButton: Button;
    private resetButton: Button;
    private chatMessages: HTMLDivElement;
    private chatInput: ChatInput;
    private chatSendButton: Button;
    private forceTurnButton: Button;
    private availableSlots: Array<PlayerColor> = ['Green', 'Purple', 'Red', 'Yellow'];

    constructor() {
        super();
        this.draftButton =  new Button('draftButton', this.processDraft);
        this.startButton = new Button('startButton', this.processStart);
        this.resetButton = new Button('resetButton', this.processReset);
        this.forceTurnButton = new Button('forceTurnButton', this.processForceTurn);
        this.chatMessages = document.getElementById('chatMessages') as HTMLDivElement;
        this.chatInput = new ChatInput('chatInput', this.handleKeyInput);
        this.chatSendButton = new Button('chatSendButton', this.sendChatMessage);
    }

    public disable(): void {
        this.disableButtons();
    }

    private sendChatMessage = (): void => {
        const message = this.chatInput.flushValue();

        if (!message || false === !!message.match(/[^\s]/)) return;

        return this.createEvent({
            type: EventType.action,
            detail: {
                action: Action.chat,
                payload: { input: message },
            },
        });
    }

    private handleKeyInput  = (toSubmit: boolean): void => {
        toSubmit && this.sendChatMessage();

        setTimeout(() => {
            this.chatInput.element.focus();
        }, 5);
    }

    private processDraft = (): void => {
        this.draftButton.disable();

        return this.createEvent({ type: EventType.draft, detail: null });
    }

    private processStart = (): void => {
        this.startButton.disable();

        return this.createEvent({ type: EventType.start_action, detail: null });
    }

    private processReset = (): void => {

        return this.createEvent({
            type: EventType.action,
            detail: { action: Action.declare_reset , payload: null }
        });
    }

    private processForceTurn = () => {

        return this.createEvent({
            type: EventType.action,
            detail: { action: Action.force_turn, payload: null }
        });
    }

    public setInfo(text: string): void {
        const info = document.getElementById('info') as HTMLDivElement;
        info.innerHTML = text;
    }

    private enableElements(...handlers: Array<{ enable(): void }>): void {
        handlers.forEach(handler => handler.enable());
    }

    private disableButtons(): void {
        this.draftButton.disable();
        this.startButton.disable();
        this.resetButton.disable();
        this.forceTurnButton.disable();
        this.chatSendButton.disable();
    }

    public updateAsEnrolment(state: EnrolmentState): void {
        this.availableSlots = state.availableSlots;

        this.updateChat(state.chat);
        this.disableButtons();

        if(localState.playerColor)
            this.enableElements(this.chatInput, this.chatSendButton);

        switch (this.availableSlots.length) {
            case 4: this.handleEmptyState(); break;
            case 0: this.handleFullState(state); break;
            default: this.handleCreatedState(state); break;
        }
    }

    public updateAsSetup(state: SetupState): void {
        this.updateChat(state.chat);
        this.disableButtons();

        if(localState.playerColor)
            this.enableElements(this.chatInput, this.chatSendButton);

        if (localState.playerColor === state.sessionOwner) {
            this.resetButton.enable();

            if (state.players.every(p => p.specialist))
                this.startButton.enable();
        }
    }

    public updateAsPlay(state: PlayState): void {
        this.updateChat(state.chat);
        this.disableButtons();

        const activePlayer = state.players.find(p => p.isActive);

        if (activePlayer && activePlayer.isIdle && localState.playerColor != activePlayer.color ) {
            this.forceTurnButton.enable();
        }

        if(localState.playerColor)
            this.enableElements(this.chatInput, this.chatSendButton);

        if (state.hasGameEnded)
            this.handleEndedState(state);
        else
            this.handleStartedState(state);
    }

    private handleCreatedState(state: EnrolmentState): void {

        if (!localState.playerColor)
            return this.setInfo('A game is waiting for you');

        if (state.sessionOwner === localState.playerColor) {

            if (state.players.length > 1 || SINGLE_PLAYER) {
                this.enableElements(this.draftButton, this.resetButton);

                return this.setInfo('You may start whenever you want!');
            }

            return this.setInfo('Waiting for more players to join...');
        }

        return this.setInfo('Waiting for owner to start...');
    }

    private handleEmptyState(): void {
        return this.setInfo('You may create the game');
    }

    private handleFullState(state: EnrolmentState): void {

        if (!localState.playerColor)
            return this.setInfo('The game is full, sorry :(');

        if (localState.playerColor === state.sessionOwner) {
            this.enableElements(this.draftButton, this.resetButton);

            return this.setInfo('You may start whenever you want');
        }

        return this.setInfo('The game might start at any time.');
    }

    private handleStartedState(state: PlayState): void {

        if (localState.playerColor) {
            this.setInfo('You are playing.');
        } else {
            this.setInfo('You are spectating.');
        }

        if (localState.playerColor === state.sessionOwner) {
            this.resetButton.enable();
        }
    }

    private handleEndedState(state: PlayState): void {
        this.setInfo('The game has ended');
        this.resetButton.enable();
        this.forceTurnButton.disable();

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

            return message.concat(`\nThe winner is ${winner.color} with ${winner[key]} ${criteria}\n`);
        }
        const addTiedPlayers = (players: Array<PlayerCountables>, criteria: string, message: string) : string => {
            const key = criteria as keyof typeof players[0];

            return message.concat(
                `\n${criteria}-tied players:\n\n${players.map(
                    player => `${player.color} : ${player[key]} ${criteria}\n`
                ).join('')}`
            );
        }

        for (const player of gameResults) {
            message = message.concat(`${player.color} : ${player.vp} VP\n`);
        }

        const vpWinners = getLeaders(gameResults, 'vp');

        if (vpWinners.length == 1)
            return alert(addWinner(vpWinners, 'vp', message));

        message = addTiedPlayers(vpWinners, 'favor', message);
        const favorWinners = getLeaders(vpWinners, 'favor');

        if (favorWinners.length == 1)
            return alert(addWinner(favorWinners, 'favor', message));

        message = addTiedPlayers(favorWinners, 'coins', message);
        const coinWinners = getLeaders(favorWinners, 'coins');

        if (coinWinners.length == 1)
            return alert(addWinner(coinWinners, 'coins', message));

        message = message.concat(`\nShared victory:\n`);

        for (const player of coinWinners)
            message = message.concat(`${player.color} : ${player.vp} VP + ${player.coins} coins\n`);

        alert(message);
    }

    private updateChat(chat: Array<ChatEntry>): void {
        this.chatMessages.innerHTML = chat.map(entry => {
            const name = entry.name ? `${entry.name}: ` : '';
            const message = entry.message;
            const color = entry.color ? clientConstants.COLOR[entry.color] : 'white';
            return `<span style="color:${color}; font-weight: bold">${name}</span>${message}</br>`;
        }).join('');
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}
