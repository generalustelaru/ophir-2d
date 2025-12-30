import { EnrolmentState, ChatEntry, Action, PlayState, SetupState, State, Phase } from '~/shared_types';
import { Communicator } from './Communicator';
import localState from '../state';
import { Button } from '../html_behaviors/button';
import { ChatInput } from '../html_behaviors/ChatInput';
import clientConstants from '~/client_constants';
import { EventType } from '~/client_types';

export const UserInterface = new class extends Communicator {

    private draftButton: Button;
    private startButton: Button;
    private resetButton: Button;
    private chatMessages: HTMLDivElement;
    private chatInput: ChatInput;
    private chatSendButton: Button;
    private forceTurnButton: Button;

    constructor() {
        super();
        const toLobby = document.querySelector('#lobby');
        toLobby && toLobby.addEventListener('click', () => {
            window.location.href = '/lobby';
        });
        this.draftButton =  new Button('draftButton', this.processDraft);
        this.startButton = new Button('startButton', this.processStart);
        this.resetButton = new Button('resetButton', this.processReset);
        this.forceTurnButton = new Button('forceTurnButton', this.processForceTurn);
        this.chatMessages = document.getElementById('chatMessages') as HTMLDivElement;
        this.chatInput = new ChatInput('chatInput', this.handleKeyInput);
        this.chatSendButton = new Button('chatSendButton', this.sendChatMessage);
    }

    public update(state: State) {
        this.disableButtons();
        this.updateChat(state.chat);

        if(localState.playerColor)
            this.enableElements(this.chatInput, this.chatSendButton);

        switch (state.sessionPhase) {
            case Phase.play: this.updateAsPlay(state); break;
            case Phase.enrolment: this.updateAsEnrolment(state); break;
            case Phase.setup: this.updateAsSetup(state);
        }
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
    };

    private handleKeyInput  = (toSubmit: boolean): void => {
        toSubmit && this.sendChatMessage();
    };

    private processDraft = (): void => {
        this.draftButton.disable();

        return this.createEvent({ type: EventType.draft, detail: null });
    };

    private processStart = (): void => {
        this.startButton.disable();

        return this.createEvent({ type: EventType.start_action, detail: null });
    };

    private processReset = (): void => {

        return this.createEvent({
            type: EventType.action,
            detail: { action: Action.declare_reset , payload: null },
        });
    };

    private processForceTurn = () => {

        return this.createEvent({
            type: EventType.action,
            detail: { action: Action.force_turn, payload: null },
        });
    };

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
        this.chatInput.disable();
    }

    private updateAsEnrolment(state: EnrolmentState): void {
        switch (state.players.length) {
            case 0: this.handleEmptyState(); break;
            case 4: this.handleFullState(state); break;
            default: this.handleCreatedState(state);
        }
    }

    private updateAsSetup(state: SetupState): void {
        if (localState.playerColor === state.sessionOwner) {
            this.resetButton.enable();

            if (state.players.every(p => p.specialist))
                this.startButton.enable();
        }
    }

    private updateAsPlay(state: PlayState): void {
        const activePlayer = state.players.find(p => p.isActive);

        if (
            activePlayer?.isIdle
            && localState.playerColor
            && localState.playerColor != activePlayer.color
        ) {
            this.forceTurnButton.enable();
        }

        if (state.hasGameEnded)
            this.handleEndedState();
        else
            this.handleStartedState(state);
    }

    private handleCreatedState(state: EnrolmentState): void {

        if (!localState.playerColor)
            return this.setInfo('Select a color to join this session.');

        if (state.sessionOwner === localState.playerColor) {
            this.resetButton.enable();

            if (state.mayDraft) {
                this.draftButton.enable();

                return this.setInfo('You may begin draft whenever you want!');
            }

            return this.setInfo('Waiting for more players to join...');
        }

        return this.setInfo('Waiting for owner to start...');
    }

    private handleEmptyState(): void {
        return this.setInfo('You may claim ownership of this session.');
    }

    private handleFullState(state: EnrolmentState): void {

        if (!localState.playerColor)
            return this.setInfo('The game is full, sorry :(');

        if (localState.playerColor === state.sessionOwner) {
            this.enableElements(this.draftButton, this.resetButton);

            return this.setInfo('You may begin draft whenever you want!');
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

    private handleEndedState(): void {
        this.setInfo('The game has ended');
        this.resetButton.enable();
        this.forceTurnButton.disable();
    }

    private updateChat(chat: Array<ChatEntry>): void {
        this.chatMessages.innerHTML = chat.map(entry => {
            const name = entry.name ? `${this.sanitizeText(entry.name)}: ` : '';
            const message = this.sanitizeText(entry.message);
            const hue = entry.color ? clientConstants.PLAYER_HUES[entry.color].vivid.light : 'inherit';
            return `<span style="color:${hue}; font-weight: bold">${name}</span>${message}</br>`;
        }).join('');
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    private sanitizeText(text: string) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

};
