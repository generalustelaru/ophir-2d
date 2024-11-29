import { PlayerId, NewState } from '../../shared_types';
import { ActionEventPayload } from '../client_types';
import { Service } from './Service';
import clientState from '../state';
import { Button } from '../html_behaviors/button';
import { CanvasService } from "./CanvasService";

export class UserInterfaceService extends Service {

    createButton; joinButton; startButton; playerColorSelect;

    constructor() {
        super();
        this.createButton = new Button('createButton', this.processEnroll);
        this.joinButton = new Button('joinButton', this.processEnroll);
        this.startButton = new Button('startButton', this.processStart);
        this.playerColorSelect = {
            element: document.getElementById('playerColorSelect') as HTMLSelectElement,
            enable: () => {
                this.playerColorSelect.element.disabled = false;
                const players = clientState.received.players
                Array.from(this.playerColorSelect.element.options).forEach(option => {
                    const player = players.find(player => player.id === option.value);
                    option.disabled = !!player;
                });
            },

            disable: () => this.playerColorSelect.element.disabled = true,
        }
    }

    private processStart = (): void => {
        this.startButton.disable();
        const canvasService: CanvasService = CanvasService.getInstance([]);
        const payload: ActionEventPayload = {
            action: 'start',
            details: canvasService.getSetupCoordinates(),
        };

        return this.broadcastEvent('action', payload);
    }

    private processEnroll = (): void => {
        const lobbyState = clientState.received as NewState;
        const selectedId = this.playerColorSelect.element.value as PlayerId;

        if (!selectedId) {
            return this.setInfo('Please select a color');
        }

        if (lobbyState.availableSlots.includes(selectedId)) {
            clientState.localPlayerId = selectedId;
            const payload: ActionEventPayload = { action: 'enroll', details: null };

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

    private disableLobbyControls(): void {
        this.createButton.disable();
        this.joinButton.disable();
        this.startButton.disable();
        this.playerColorSelect.disable();
    }

    public updateGameControls(): void {
        this.disableLobbyControls();
    }

    public updateLobbyControls(): void {
        this.disableLobbyControls();

        switch (clientState.received.gameStatus) {
            case 'empty': this.enableCreate(); break;
            case 'created': this.enableJoinOrStart(); break;
            case 'full': this.enableStartForOwner(); break;
        }
    }

    private enableJoinOrStart(): void {

        if (!clientState.localPlayerId) {
            this.enableElements(this.joinButton, this.playerColorSelect);

            return this.setInfo('A game is waiting for you');
        }

        if (clientState.received.sessionOwner === clientState.localPlayerId) {
            this.startButton.enable();

            return this.setInfo('You may wait for more player or start');
        }

        return this.setInfo('Waiting for players to join...');
    }

    private enableCreate(): void {
        this.enableElements(this.createButton, this.playerColorSelect);

        return this.setInfo('You may create the game');
    }

    private enableStartForOwner(): void {

        if (!clientState.localPlayerId) {
            return this.setInfo('The game is full, sorry :(');
        }

        if (clientState.localPlayerId === clientState.received.sessionOwner) {
            this.startButton.enable();

            return this.setInfo('You may start whenever you want');
        }

        return this.setInfo('The game might start at any time.');
    }
}
