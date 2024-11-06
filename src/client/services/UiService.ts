import { ManifestItem, PlayerId, PreSessionSharedState, SharedState } from '../../shared_types';
import { ActionEventPayload } from '../client_types';
import { Service, ServiceInterface } from './Service';
import state from '../state';
import sharedConstants from '../../shared_constants';
import clientConstants from '../client_constants';
import { Button } from '../html_behaviors/button';
import { CanvasService, CanvasInterface } from "./CanvasService";

export interface UiInterface extends ServiceInterface {
    setInfo: (text: string) => void,
    updateLobbyControls(): void,
    updateGameControls(): void,
}

const { ACTION, STATUS } = sharedConstants;
const { EVENT } = clientConstants;

export class UserInterfaceService extends Service implements UiInterface {

    createButton; joinButton; startButton; playerColorSelect;
    favorButton; favorCounter; pickupGoodButton; dropItemSelect; endTurnButton;

    constructor() {
        super();
        this.createButton = new Button('createButton', this.processEnroll);
        this.joinButton = new Button('joinButton', this.processEnroll);
        this.startButton = new Button('startButton', this.processStart);
        this.playerColorSelect = {
            element: document.getElementById('playerColorSelect') as HTMLSelectElement,
            enable: () => {
                this.playerColorSelect.element.disabled = false;
                const players = state.server.players
                Array.from(this.playerColorSelect.element.options).forEach(option => {
                    switch (true) {
                        case players && (option.value in players):
                        case option.value === '': option.disabled = true; break;
                        default: option.disabled = false; break
                    }
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
                const serverState = state.server as SharedState;
                const manifest = serverState.players[state.localPlayerId as PlayerId].cargo;
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
                element.disabled = true},
        }

        this.favorButton = new Button('favorButton', this.processFavor);
        this.favorCounter = {
            element: document.getElementById('favorCounter') as HTMLInputElement,
            set: (value: number) => this.favorCounter.element.value = value.toString(),
        }
        this.pickupGoodButton = new Button('pickupGoodButton', this.processPickup);
        this.endTurnButton = new Button('endTurnButton', this.processEndTurn);
    }

    private processStart = (): void => {
        this.startButton.disable();
        const canvasService = CanvasService.getInstance([]) as CanvasInterface;
        const payload: ActionEventPayload = {
            action: ACTION.start,
            details: canvasService.getSetupCoordinates(),
        };

        return this.broadcastEvent(EVENT.action, payload);
    }

    private processEnroll = (): void => {
        const lobbyState = state.server as PreSessionSharedState;
        const selectedId = this.playerColorSelect.element.value as PlayerId;

        if (!selectedId) {
            return this.setInfo('Please select a color');
        }

        if (lobbyState.availableSlots.includes(selectedId)) {
            state.localPlayerId = selectedId as PlayerId;
            const payload: ActionEventPayload = { action: ACTION.enroll, details: null };

            return this.broadcastEvent(EVENT.action, payload);
        }

        return this.setInfo('This color has just been taken :(');
    }

    private processFavor = (): void => {
        const payload: ActionEventPayload = { action: ACTION.favor, details: null };

        return this.broadcastEvent(EVENT.action, payload);
    }

    private processPickup = (): void => {
        const payload: ActionEventPayload = { action: ACTION.pickup_good, details: null };

        return this.broadcastEvent(EVENT.action, payload);
    }

    private requestItemDrop = (): void => {
        const item = this.dropItemSelect.element.value as ManifestItem;
        const payload: ActionEventPayload = { action: ACTION.drop_item, details: { item } };

        return this.broadcastEvent(EVENT.action, payload);
    }
    private processEndTurn = (): void => {
        const payload: ActionEventPayload = { action: ACTION.turn, details: null };

        return this.broadcastEvent(EVENT.action, payload);
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
        const serverState = state.server as SharedState;
        const player = serverState.players[state.localPlayerId as PlayerId];

        this.favorCounter.set(player?.favor ?? 0);

        if (player?.isActive) {

            if (player.hasCargo) {
                this.dropItemSelect.enable();
            }

            if (player.isAnchored) {
                this.endTurnButton.enable();

            }

            if (
                player.allowedSettlementAction === ACTION.pickup_good // will probably become a switch as new actions are added
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

        switch (state.server.gameStatus) {
            case STATUS.empty: this.enableCreate(); break;
            case STATUS.created: this.enableJoinOrStart(); break;
            case STATUS.full: this.enableStartForOwner(); break;
        }
    }

    private enableJoinOrStart(): void {

        if (!state.localPlayerId) {
            this.enableElements(this.joinButton, this.playerColorSelect);

            return this.setInfo('A game is waiting for you');
        }

        if (state.server.sessionOwner === state.localPlayerId) {
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

        if (!state.localPlayerId) {
            return this.setInfo('The game is full, sorry :(');
        }

        if (state.localPlayerId === state.server.sessionOwner) {
            this.startButton.enable();

            return this.setInfo('You may start whenever you want');
        }

        return this.setInfo('The game might start at any time.');
    }
}
