import { UiInterface, PlayerId, ActionEventPayload } from '../types.js';
import { Service } from './service';
import state from '../state';
import constants from '../constants.json';
import { Button } from '../html_components/button';

const { ACTION, EVENT, STATUS } = constants;

export class UserInterfaceService extends Service implements UiInterface {

    createButton; joinButton; startButton; playerColorSelect;

    constructor() {
        super();
        this.createButton = new Button('createButton', this.processEnroll);
        this.joinButton = new Button('joinButton', this.processEnroll);
        this.startButton = new Button('startButton', this.processStart);
        this.playerColorSelect = {
            element: document.getElementById('playerColorSelect') as HTMLSelectElement,
            callback: null as any,
            enable: () => {
                this.playerColorSelect.element.disabled = false;
                const players = state.server.players
                Array.from(this.playerColorSelect.element.options).forEach(option => {
                    option.disabled = players[option.value as PlayerId] != null;
                });
            },

            disable: () => this.playerColorSelect.element.disabled = true,
        }
    }

    processStart = () => {
        this.startButton.disable();
        const payload: ActionEventPayload = {action: ACTION.start, details: null};
        this.broadcastEvent(EVENT.action, payload);
    }

    processEnroll = () => {
        const selectedId = this.playerColorSelect.element.value;

        if (!selectedId) {
            this.setInfo('Please select a color');

            return;
        }

        if (state.server.availableSlots.includes(selectedId)) {
            state.playerId = selectedId as PlayerId;
            const payload: ActionEventPayload = {action: ACTION.enroll, details: null};
            this.broadcastEvent(EVENT.action, payload);
        } else {
            this.setInfo('This color has just been taken :(');
        }
    }

    setInfo = (text: string) => {
        const info = document.getElementById('info');
        info.innerHTML = text;
    }

    enableElements = (...handlers: { enable:()=>void }[]) => {
        handlers.forEach(handler => handler.enable());
    }

    disableAllElements = () => {
        this.createButton.disable();
        this.joinButton.disable();
        this.startButton.disable();
        this.playerColorSelect.disable();
    }

    updatePreSessionUi() {
        this.disableAllElements();
        switch (state.server.status) {
            case STATUS.empty:
                this.enableElements(
                    this.createButton,
                    this.playerColorSelect
                );
                this.setInfo('You may create the game');
                break;
            case STATUS.lobby:
                if (!state.playerId) {
                    this.enableElements(
                        this.joinButton,
                        this.playerColorSelect
                    );
                    this.setInfo('A game is waiting for you');
                } else if (state.server.sessionOwner == state.playerId) {
                    this.startButton.enable();
                    this.setInfo('You may wait for more player or start');
                } else {
                    this.setInfo('Waiting for players to join...');
                }
                break;
            case STATUS.full:
                if (!state.playerId) {
                    this.setInfo('The game is full, sorry :(');
                } else if (state.playerId == state.server.sessionOwner) {
                    this.startButton.enable();
                    this.setInfo('You may start whenever you want');
                } else {
                    this.setInfo('The game might start at any time.');
                }
                break;
            default:
                break;
        }
    }
}
