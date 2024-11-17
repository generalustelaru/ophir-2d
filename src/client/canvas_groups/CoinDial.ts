import Konva from 'konva';
import clientConstants from '../client_constants';
import { DynamicGroupInterface } from '../client_types';
import { Coordinates } from '../../shared_types';

const { COLOR } = clientConstants;
export class CoinDial implements DynamicGroupInterface<number> {
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
            fill: COLOR.boneWhite,
        });

        const coinSide = new Konva.Circle({
            y: 3,
            radius: 20,
            fill: 'black',
        });

        this.coinCenter = this.group.getClientRect().width / 2;
        this.amount = new Konva.Text({
            x: this.coinCenter - 5,
            y: this.coinCenter - 10,
            text: amount.toString(),
            fontSize: 20,
            fill: 'black',
            fontFamily: 'Arial',
        });

        this.group.add(coinSide, coinTop, this.amount);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(value: number): void {
        this.amount.text(value.toString());
        this.amount.x(value > 9 ? this.coinCenter - 12 : this.coinCenter - 5);
    }
}