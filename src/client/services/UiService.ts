import { EnrolmentState, ChatEntry, Action, PlayState, SetupState, State, Phase } from '~/shared_types';
import { Communicator } from './Communicator';
import localState from '../state';
import { Button } from '../html_behaviors/button';
import { ChatInput } from '../html_behaviors/ChatInput';
import clientConstants from '~/client_constants';
import { EventType, MessageType } from '~/client_types';

export const UserInterface = new class extends Communicator {
    private continueButton: Button;
    private resetButton: Button;
    private popDisplay: HTMLDivElement;
    private isPopDisplaying: boolean = false;
    private popTimeStamp: number | null = null;
    private popCache: Array<{timeStamp: number, hyperText: string}> = [];
    private chatMessages: HTMLDivElement;
    private chatInput: ChatInput;
    private chatSendButton: Button;
    private forceTurnButton: Button;
    private phase: Phase = Phase.enrolment;

    constructor() {
        super();
        const toLobby = document.querySelector('#lobby');
        toLobby && toLobby.addEventListener('click', () => {
            window.location.href = '/lobby';
        });
        this.continueButton = new Button('continueButton', this.processContinue);
        this.resetButton = new Button('resetButton', this.processReset);
        this.forceTurnButton = new Button('forceTurnButton', this.processForceTurn);
        this.popDisplay = document.querySelector('#chatPop') as HTMLDivElement;
        this.chatMessages = document.querySelector('#chatMessages') as HTMLDivElement;
        this.chatInput = new ChatInput('chatInput', this.handleKeyInput);
        this.chatSendButton = new Button('chatSendButton', this.sendChatMessage);

        setInterval(() => {
            if (this.isPopDisplaying)
                return;

            if(this.popCache.length == 0)
                return;

            const { timeStamp, hyperText } = this.popCache.shift()!;
            this.popDisplay.innerHTML = hyperText;
            this.isPopDisplaying = true;

            this.popDisplay.style.visibility = 'visible';
            this.popTimeStamp = timeStamp;

            setTimeout(() => {
                this.popDisplay.classList.add('hidden');
            }, 5000);

            setTimeout(() => {
                this.popDisplay.style.visibility = 'hidden';
                this.popDisplay.classList.remove('hidden');
                this.isPopDisplaying = false;
            }, 5200);
        },1000);
    }

    public update(state: State) {
        this.disableButtons();
        this.updateChat(state.chat);

        if(localState.playerColor)
            this.enableElements(this.chatInput, this.chatSendButton);

        switch (state.sessionPhase) {
            case Phase.play: this.updateAsPlay(state); break;
            case Phase.conclusion: this.updateAsConcluded(); break;
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

    private processContinue = (): void => {

        return this.createEvent({
            type: this.phase == Phase.setup ? EventType.start_play : EventType.start_setup,
            detail: null,
        });
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
        this.continueButton.disable();
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
        this.phase = Phase.setup;
        if (localState.playerColor === state.sessionOwner) {
            this.resetButton.enable();

            if (state.players.every(p => p.specialist))
                this.continueButton.enable();
        }
    }

    private updateAsPlay(state: PlayState): void {
        this.phase = Phase.play;
        const activePlayer = state.players.find(p => p.isActive);

        if (
            activePlayer?.isIdle
            && localState.playerColor
            && localState.playerColor != activePlayer.color
        ) {
            this.forceTurnButton.enable();
        }

        this.handleStartedState(state);
    }

    private updateAsConcluded(): void {
        this.setInfo('The game has ended');
        if (localState.playerColor) {
            this.resetButton.enable();
        }
        this.forceTurnButton.disable();
    }

    private handleCreatedState(state: EnrolmentState): void {

        if (!localState.playerColor)
            return this.setInfo('Select a color to join this session.');

        if (state.sessionOwner === localState.playerColor) {
            this.resetButton.enable();

            if (state.mayDraft) {
                this.continueButton.enable();

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
            this.enableElements(this.continueButton, this.resetButton);

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

    public addInternalPop(type: MessageType, message: string) {
        const hue = type == MessageType.ERROR ? 'red' : 'inherit';
        this.popCache.push({
            timeStamp: Date.now(),
            hyperText: `<span style="color${hue}; font-weight: bold">${type}: </span>${message}</br>`,
        });
    }

    private updateChat(chat: Array<ChatEntry>): void {
        // TODO: transform into regular loop to have the last formatted message available as a side effect.
        this.chatMessages.innerHTML = chat.map(entry => {
            const name = entry.name ? `${this.sanitizeText(entry.name)}: ` : '';
            const message = this.sanitizeText(entry.message);
            const hue = entry.color ? clientConstants.PLAYER_HUES[entry.color].vivid.light : 'inherit';
            return `<span style="color:${hue}; font-weight: bold">${name}</span>${message}</br>`;
        }).join('');
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        const lastEntry = chat[chat.length - 1];

        if (
            lastEntry &&
            localState.playerColor != lastEntry.color &&
            (!this.popTimeStamp || lastEntry.timeStamp > this.popTimeStamp)
        ) {
            const { timeStamp, color, name, message } = lastEntry;
            const saneName = name ? `${this.sanitizeText(name)}: ` : '';
            const saneMessage = this.sanitizeText(message);
            const hue = color ? clientConstants.PLAYER_HUES[color].vivid.light : 'inherit';

            const hyperText = `<span style="color:${hue}; font-weight: bold">${saneName}</span>${saneMessage}</br>`;
            this.popCache.push({ timeStamp, hyperText });
        }
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
