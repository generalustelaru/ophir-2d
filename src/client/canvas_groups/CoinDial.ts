import Konva from 'konva';
import clientConstants from '../client_constants';
import { DynamicGroupInterface } from '../client_types';
import { Coordinates } from '../../shared_types';

const { COLOR } = clientConstants;
export class CoinDial implements DynamicGroupInterface<number> {
    private group: Konva.Group;
    private amount: Konva.Text;
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

        const coinCenter = this.group.getClientRect().width / 2;
        this.amount = new Konva.Text({
            x: coinCenter - 5,
            y: coinCenter - 10,
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
    }
}