import Konva from 'konva';
import clientConstants from '~/client_constants';
import { DynamicGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';

const { HUES, LOCATION_TOKEN_DATA } = clientConstants;
export class CoinDial implements Unique<DynamicGroupInterface<number>> {
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

        const coinTop = new Konva.Circle({
            radius: 20,
            border: 1,
            borderFill: 'black',
            fill: HUES.coinSilver,
        });

        const coinBevel = new Konva.Circle({
            radius: 16,
            stroke: HUES.upgradeBoxSilver,
            strokeWidth: 1,
        });

        const templeIcon = new Konva.Path({
            data: LOCATION_TOKEN_DATA.temple.shape,
            stroke: HUES.upgradeBoxSilver,
            strokeWidth: .5,
            scale: { x: 2.1, y: 1.4 },
            x: -12,
            y: -9,
        });

        const coinSide = new Konva.Circle({
            y: 3,
            radius: 20,
            fill: 'black',
        });

        this.coinCenter = this.group.getClientRect().width / 2;
        this.amount = new Konva.Text({
            x: this.coinCenter - 5,
            y: this.coinCenter - 8,
            text: amount.toString(),
            fontSize: 20,
            fill: HUES.upgradeBoxSilver,
            stroke: HUES.darkerSilver,
            fontFamily: 'Calibri',
        });

        this.group.add(coinSide, coinTop, coinBevel, templeIcon, this.amount);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(value: number): void {
        this.amount.text(value.toString());
        this.amount.x(value > 9 ? this.coinCenter - 10 : this.coinCenter - 5);
    }

    public show() {
        this.group.visible(true);
    }

    public hide() {
        this.group.visible(false);
    }
}