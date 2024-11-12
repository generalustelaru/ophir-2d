import { ManifestItem, PlayerId, NewState, SharedState } from '../../shared_types';
import { ActionEventPayload } from '../client_types';
import { Service, ServiceInterface } from './Service';
import clientState from '../state';
import { Button } from '../html_behaviors/button';
import { CanvasService, CanvasInterface } from "./CanvasService";

export interface UiInterface extends ServiceInterface {
    setInfo: (text: string) => void,
    updateLobbyControls(): void,
    updateGameControls(): void,
}

export class UserInterfaceService extends Service implements UiInterface {

    createButton; joinButton; startButton; playerColorSelect;
    favorButton; pickupGoodButton; dropItemSelect; endTurnButton;

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

        this.dropItemSelect = {
            element: document.getElementById('dropItemSelect') as HTMLSelectElement,
            enable: () => {
                const element = this.dropItemSelect.element;

                element.addEventListener('change', this.requestItemDrop);

                while (element.firstChild) {
                    element.removeChild(element.firstChild);
                }

                const titleOption = document.createElement('option');
                titleOption.value = '';
                titleOption.text = '--Drop Item--';
                titleOption.selected = true;
                element.appendChild(titleOption);
                const serverState = clientState.received as SharedState;
                const manifest = serverState.players.find(player => player.id === clientState.localPlayerId)?.cargo;

                if (!manifest) {
                    throw new Error('Player not found');
                }

                for (let i = 0; i < manifest.length; i++) {

                    if (manifest[i] === 'empty') {
                        continue;
                    }

                    const itemOption = document.createElement('option');
                    itemOption.value = manifest[i];
                    itemOption.text = manifest[i];
                    element.appendChild(itemOption);
                }

                element.disabled = false;

            },

            disable: () => {
                const element = this.dropItemSelect.element;
                const titleOption = document.createElement('option');
                titleOption.value = '';
                titleOption.text = '--Drop Item--';
                titleOption.selected = true;
                element.appendChild(titleOption);
                element.removeEventListener('change', this.requestItemDrop);
                element.disabled = true;
            },
        }

        this.favorButton = new Button('favorButton', this.processFavor);
        this.pickupGoodButton = new Button('pickupGoodButton', this.processPickup);
        this.endTurnButton = new Button('endTurnButton', this.processEndTurn);
    }

    private processStart = (): void => {
        this.startButton.disable();
        const canvasService: CanvasInterface = CanvasService.getInstance([]);
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

    private processFavor = (): void => {
        const payload: ActionEventPayload = { action: 'favor', details: null };

        return this.broadcastEvent('action', payload);
    }

    private processPickup = (): void => {
        const payload: ActionEventPayload = { action: 'pickup_good', details: null };

        return this.broadcastEvent('action', payload);
    }

    private requestItemDrop = (): void => {
        const item = this.dropItemSelect.element.value as ManifestItem;
        const payload: ActionEventPayload = { action: 'drop_item', details: { item } };

        return this.broadcastEvent('action', payload);
    }
    private processEndTurn = (): void => {
        const payload: ActionEventPayload = { action: 'turn', details: null };

        return this.broadcastEvent('action', payload);
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

    private disableGameControls(): void {
        this.favorButton.disable();
        this.pickupGoodButton.disable();
        this.endTurnButton.disable();
        this.dropItemSelect.disable();
    }

    public updateGameControls(): void {
        this.disableLobbyControls();
        this.disableGameControls();
        const serverState = clientState.received as SharedState;
        const player = serverState.players.find(player => player.id === clientState.localPlayerId);

        if (player?.isActive) {

            if (player.hasCargo) {
                this.dropItemSelect.enable();
            }

            if (player.isAnchored) {
                this.endTurnButton.enable();

            }

            if (
                player.allowedSettlementAction === 'pickup_good' // will probably become a switch as new actions are added
                && player.cargo.find(item => item === 'empty')
            ) {
                this.pickupGoodButton.enable();
            }

            if (player.favor > 0 && !player.hasSpentFavor && player.moveActions > 0) {
                this.favorButton.enable();
            }
        }
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
