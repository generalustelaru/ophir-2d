import Konva from 'konva';
import { StaticGroupInterface } from '~/client_types';
import { PlayState, Unique } from '~/shared_types';
import clientConstants from '~/client/client_constants';
import { PlayerCountables } from '~/server/server_types';

const { COLOR, STAGE_AREA} = clientConstants;
export class ResultsPanel implements Unique<StaticGroupInterface> {

    private group: Konva.Group;

    constructor(state: PlayState) {
        this.group = new Konva.Group();
        const { width, height } = STAGE_AREA;

        const panelBody = new Konva.Rect({
            width: width / 4,
            height,
            fill: COLOR.modalBlue,
            cornerRadius: 10,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });

        const results = new Konva.Text({
            text: this.composeResults(state.gameResults),
            fill: 'white',
            fontSize: 18,
            lineHeight: 1.2,
        });

        this.group.add(panelBody, results);
    }

    public getElement() {
        return this.group;
    }

    private composeResults(gameResults: Array<PlayerCountables>): string {
        let message = 'Results:\n\n';

        // add player scores
        for (const player of gameResults) {
            message += (`${player.name} (${player.color}): ${player.vp}VP\n`);
        }

        const vpLeaders = this.getLeaders(gameResults, 'vp');

        if (vpLeaders.length == 1) {
            message += (this.addWinner(vpLeaders[0], 'vp'));
            return message;
        }

        message += this.addTiedPlayers(vpLeaders, 'favor');

        const favorLeaders = this.getLeaders(vpLeaders, 'favor');

        if (favorLeaders.length == 1) {
            message += (this.addWinner(favorLeaders[0], 'favor'));
            return message;
        }

        message += this.addTiedPlayers(favorLeaders, 'coins');
        const coinLeaders = this.getLeaders(favorLeaders, 'coins');

        if (coinLeaders.length == 1) {
            message += (this.addWinner(coinLeaders[0], 'coins'));
            return message;
        }

        message += ('\nShared victory:\n');

        for (const player of coinLeaders)
            message += (`${player.color} : ${player.vp}VP\n`);

        return message;
    }

    private getLeaders(tiedPlayers: Array<PlayerCountables>, criteria: string): Array<PlayerCountables> {
        const key = criteria as keyof PlayerCountables;
        const topValue = tiedPlayers.reduce((acc, player) => {
            const value = player[key] as number;

            return value > acc ? value : acc;
        }, 0);

        return tiedPlayers.filter(player => player[key] === topValue);
    };

    private addTiedPlayers(players: Array<PlayerCountables>, criteria: string): string {
        const key = criteria as keyof PlayerCountables;

        const playerList = players.map(player => `${player.name}: ${player[key]} ${criteria}\n`).join('')

        return `\nTie-break by ${criteria}:\n\n${playerList}`;
    };

    private addWinner(winner: PlayerCountables, criteria: string): string {
        const key = criteria as keyof PlayerCountables;

        return `\nWinner is:\n\n${winner.name}: ${winner.vp}VP (and ${winner[key]} ${criteria})\n`;
    };
}