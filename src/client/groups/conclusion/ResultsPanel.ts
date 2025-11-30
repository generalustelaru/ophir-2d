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
        });

        this.group.add(panelBody, results);
    }

    public getElement() {
        return this.group;
    }

    private composeResults(gameResults: Array<PlayerCountables>): string {
        let message = 'The game has ended\n\n';

        const getLeaders = (tiedPlayers: Array<PlayerCountables>, criteria: string) : Array<PlayerCountables> => {
            const key = criteria as keyof typeof tiedPlayers[0];
            const topValue = tiedPlayers.reduce((acc, player) => {
                const value = player[key] as number;

                return value > acc ? value : acc;
            }, 0);

            return tiedPlayers.filter(player => player[key] === topValue);
        };

        const addWinner = (winnerAsArray: Array<PlayerCountables>, criteria: string, message: string) : string => {
            const winner = winnerAsArray[0];
            const key = criteria as keyof typeof winner;

            return message.concat(`\nThe winner is ${winner.name} with ${winner[key]} ${criteria}\n`);
        };
        const addTiedPlayers = (players: Array<PlayerCountables>, criteria: string, message: string) : string => {
            const key = criteria as keyof typeof players[0];

            return message.concat(
                `\n${criteria}-tied players:\n\n${players.map(
                    player => `${player.color} : ${player[key]} ${criteria}\n`,
                ).join('')}`,
            );
        };

        for (const player of gameResults) {
            message = message.concat(`${player.name} (${player.color}) : ${player.vp} VP\n`);
        }

        const vpWinners = getLeaders(gameResults, 'vp');

        if (vpWinners.length == 1)
            return addWinner(vpWinners, 'vp', message);

        message = addTiedPlayers(vpWinners, 'favor', message);
        const favorWinners = getLeaders(vpWinners, 'favor');

        if (favorWinners.length == 1)
            return addWinner(favorWinners, 'favor', message);

        message = addTiedPlayers(favorWinners, 'coins', message);
        const coinWinners = getLeaders(favorWinners, 'coins');

        if (coinWinners.length == 1)
            return addWinner(coinWinners, 'coins', message);

        message = message.concat('\nShared victory:\n');

        for (const player of coinWinners)
            message = message.concat(`${player.color} : ${player.vp} VP + ${player.coins} coins\n`);

        return message;
    }
}