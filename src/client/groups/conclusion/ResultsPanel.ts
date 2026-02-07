import Konva from 'konva';
import { Dimensions, StaticGroupInterface } from '~/client_types';
import { PlayerCountables, PlayState, Unique } from '~/shared_types';
import clientConstants from '~/client/client_constants';

const { HUES } = clientConstants;
export class ResultsPanel implements Unique<StaticGroupInterface> {

    private group: Konva.Group;

    constructor(state: PlayState, dimensions: Dimensions) {
        const { width, height } = dimensions;
        this.group = new Konva.Group({ width, height });

        const panelBody = new Konva.Rect({
            width: width + 25,
            height,
            fill: HUES.modalBlue,
            cornerRadius: 10,
            stroke: HUES.boneWhite,
            strokeWidth: 2,
        });

        const results = new Konva.Text({
            text: this.composeResults(state.gameResults),
            fill: 'white',
            fontSize: 18,
            lineHeight: 1.2,
            x: 10,
            y: 10,
            fontFamily: 'Custom',
        });

        this.group.add(panelBody, results);
    }

    public getElement() {
        return this.group;
    }

    private composeResults(playerResults: Array<PlayerCountables>): string {
        let pool: Array<PlayerCountables> = playerResults.map(r => r);
        let leaders: Array<PlayerCountables> = [];
        let message = 'Results:\n\n';

        function poolLeaders() {
            pool = leaders;
            leaders = [];
        }

        function writeRunnerups(criteria: 'vp'|'favor'|'coins') {
            pool.sort((a, b) => b[criteria] - a[criteria]);
            const threshold = pool[0][criteria];
            leaders = pool.filter( r => r[criteria] == threshold);

            for (const countable of pool) {
                message += (`${countable.name} (${countable.color}): ${countable[criteria]} ${criteria}\n`);
            }
        }

        function writeWinner(criteria: 'vp'|'favor'|'coins') {
            const tieBreaker = pool[0][criteria] - (pool[1] ? pool[1][criteria] : 0);
            message += `\n${pool[0].name} has won by ${tieBreaker} ${criteria}.\n`;
        };

        writeRunnerups('vp');

        if (leaders.length == 1) {
            writeWinner('vp');

            return message;
        }

        poolLeaders();
        message += '\nTie-breaking by favor...\n';
        writeRunnerups('favor');

        if (leaders.length == 1) {
            writeWinner('favor');

            return message;
        }

        poolLeaders();
        message += '\nTie-breaking by coins...\n';
        writeRunnerups('coins');

        if (leaders.length == 1) {
            writeWinner('coins');

            return message;
        }

        message += ('\nShared victory:\n');

        for (const countable of leaders)
            message += (`${countable.color}\n`);

        return message;
    }
}