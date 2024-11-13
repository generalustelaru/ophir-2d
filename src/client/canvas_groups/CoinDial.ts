import Konva from 'konva';
import clientConstants from '../client_constants';
import { DynamicGroupInterface } from '../client_types';

const { COLOR } = clientConstants;
export class CoinDial implements DynamicGroupInterface<number> {
    private group: Konva.Group;
    private coins: Konva.Text;
    constructor(
        coins: number,
    ) {
        this.group = new Konva.Group({
            x: 105,
            y: 63,
        });

        const coinTop = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 20,
            border: 1,
            borderFill: 'black',
            fill: COLOR.boneWhite,
        });

        const coinSide = new Konva.Circle({
            x: 0,
            y: 3,
            radius: 20,
            fill: 'black',
        });

        const coinCenter = this.group.getClientRect().width/2;
        this.coins = new Konva.Text({
            x: coinCenter - 5,
            y: coinCenter - 10,
            text: coins.toString(),
            fontSize: 20,
            fill: 'black',
            fontFamily: 'Arial',
        });

        this.group.add(coinSide, coinTop, this.coins);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(value: number): void {
        this.coins.text(value.toString());
    }
}