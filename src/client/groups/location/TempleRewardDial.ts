import Konva from 'konva';
import { DynamicGroupInterface } from '../../client_types';
import { Coordinates } from '../../../shared_types';
import { FavorIcon } from '../FavorIcon';
import clientConstants from '../../client_constants';

const { ICON_DATA } = clientConstants;

export class TempleRewardDial implements DynamicGroupInterface<number> {
    private group: Konva.Group;
    private amount: Konva.Text;
    private coinCenter: number;
    constructor(
        position: Coordinates,
        amount: number,
    ) {
        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
        });

        const favorIcon = new FavorIcon({ x: -25, y: -25, width: 0, height: 0 });

        const semiDisc = new Konva.Path({
            data: ICON_DATA.golden_semidisc.shape,
            fill: ICON_DATA.golden_semidisc.fill,
            x: -27,
            y: -27,
            scale: { x: 2, y: 2 },
        });

        const semiWreath = new Konva.Path({
            data: ICON_DATA.half_wreath.shape,
            fill: ICON_DATA.half_wreath.fill,
            x: -27,
            y: -24,
            scale: { x: 2, y: 2 },
        });

        this.coinCenter = this.group.getClientRect().width / 2;
        this.amount = new Konva.Text({
            x: this.coinCenter - 9,
            y: this.coinCenter - 15,
            text: amount.toString(),
            fontSize: 30,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 1,
            fontFamily: 'Arial',
        });

        this.group.add(...[
            favorIcon.getElement(),
            semiDisc,
            semiWreath,
            this.amount
        ]);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(value: number): void {
        this.amount.text(value.toString());
        this.amount.x(value > 9 ? this.coinCenter - 12 : this.coinCenter - 5);
    }
}