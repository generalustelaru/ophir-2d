import Konva from 'konva';
import clientConstants from '../client_constants';
import { DynamicGroupInterface } from '../client_types';
import { Coordinates } from '../../shared_types';

const { COLOR, LOCATION_TOKEN_DATA } = clientConstants;
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
            fill: COLOR.coinSilver,
        });

        const coinBevel = new Konva.Circle({
            radius: 16,
            stroke: COLOR.upgradeBoxSilver,
            strokeWidth: 1,
        });

        const templeIcon = new Konva.Path({
            data: LOCATION_TOKEN_DATA.temple.shape,
            stroke: COLOR.upgradeBoxSilver,
            strokeWidth: 1,
            scale: { x: 1, y: .7 },
            x: -13,
            y: -10,
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
            fill: COLOR.upgradeBoxSilver,
            stroke: COLOR.boneWhite,
            fontFamily: 'Calibri',
        });

        this.group.add(coinSide, coinTop, coinBevel, templeIcon, this.amount);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public getDiameter(): number {
        return this.group.getClientRect().width;
    }

    public updateElement(value: number): void {
        this.amount.text(value.toString());
        this.amount.x(value > 9 ? this.coinCenter - 10 : this.coinCenter - 5);
    }
}