import { Service } from './service.js';
import state from '../state.js';
import constants from '../constants.json';
import { Button } from '../html_components/button.js';

const { ACTION, EVENT, STATUS } = constants;

export class UserInterfaceService extends Service {
    constructor() {
        super();
        this.createButton = new Button('createButton', this.processEnroll);
        this.joinButton = new Button('joinButton', this.processEnroll);
        this.startButton = new Button('startButton', this.processStart);
        this.playerColorSelect = {
            element: document.getElementById('playerColorSelect'),

            enable: () => {
                this.playerColorSelect.element.disabled = false;
                Array.from(this.playerColorSelect.element.options).forEach(option => {
                    option.disabled = state.server.players[option.value] != null;
                });
            },

            disable: () => this.playerColorSelect.element.disabled = true,
        }
    }

    processStart = () => {
        dispatchEvent(new CustomEvent(
            EVENT.action, {detail: {action: ACTION.start}}
        ));
    }

    processEnroll = () => {
        const selectedId = this.playerColorSelect.element.value;

        if (!selectedId) {
            this.setInfo('Please select a color');

            return;
        }

        if (state.server.availableSlots.includes(selectedId)) {
            state.playerId = selectedId;
            dispatchEvent(new CustomEvent(
                EVENT.action, {detail: {action: ACTION.enroll}}
            ));
        } else {
            this.setInfo('This color has just been taken :(');
        }
    }

    setInfo = (text) => {
        const info = document.getElementById('info');
        info.innerHTML = text;
    }

    enableElements = (...buttons) => {
        buttons.forEach(button => button.enable());
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
                    state.isSpectator = true;
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
