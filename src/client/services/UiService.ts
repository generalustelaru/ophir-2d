import { PlayerId, NewState } from '../../shared_types';
import { ActionEventPayload } from '../client_types';
import { Service } from './Service';
import clientState from '../state';
import { Button } from '../html_behaviors/button';
import { CanvasService } from "./CanvasService";
import { PlayerCountables } from '../../server/server_types';

export class UserInterfaceService extends Service {

    createButton: Button;
    joinButton: Button;
    startButton: Button;
    resetButton: Button;
    playerColorSelect;

    constructor() {
        super();
        this.createButton = new Button('createButton', this.processEnroll);
        this.joinButton = new Button('joinButton', this.processEnroll);
        this.startButton = new Button('startButton', this.processStart);
        this.resetButton = new Button('resetButton', this.processReset);
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

    private processReset = (): void => {
        const payload: ActionEventPayload = { action: 'reset', details: null };

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
        this.resetButton.disable();
    }

    public updateGameControls(): void {
        this.disableLobbyControls();
        this.resetButton.enable();
    }

    public updateLobbyControls(): void {
        this.disableLobbyControls();

        switch (clientState.received.gameStatus) {
            case 'empty': this.enableCreate(); break;
            case 'created': this.enableJoinOrStart(); break;
            case 'full': this.enableStartForOwner(); break;
            case 'started': this.enableResetForOwner(); break;
            case 'ended': {
                this.setInfo('The game has ended');
                this.enableResetForOwner();
                this.alertGameResults();
            } break;
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

    private enableResetForOwner(): void {

        if (clientState.localPlayerId === clientState.received.sessionOwner) {
            this.resetButton.enable();
        }
    }

    private alertGameResults(): void {
        localStorage.removeItem('playerId');
        const results = clientState.received.gameResults;
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
}
