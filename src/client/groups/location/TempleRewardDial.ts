import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import { FavorIcon } from '../popular';
import clientConstants from '~/client_constants';

const { ICON_DATA, COLOR } = clientConstants;

export class TempleRewardDial implements Unique<DynamicGroupInterface<number>> {
    private group: Konva.Group;
    private vpAmount: Konva.Text;
    private favorAmount: Konva.Text;
    constructor(
        position: Coordinates,
        amount: number | null,
    ) {
        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
            // width: 66, height: 96,
        });

        const favorIcon = new FavorIcon({ x: -20, y: -23, width: 0, height: 0 }, 'medium');

        const semiDisc = new Konva.Wedge({
            y: -1,
            radius: 22,
            angle: 180,
            fill: COLOR.vpGold,
            rotation: 90,
        });

        const semiWreath = new Konva.Path({
            data: ICON_DATA.half_wreath.shape,
            fill: ICON_DATA.half_wreath.fill,
            x: -27,
            y: -24,
            scale: { x: 2, y: 2 },
        });

        const coinCenter = this.group.getClientRect().width / 2;

        this.vpAmount = new Konva.Text({
            x: coinCenter - 12,
            y: coinCenter - 10,
            text: String(amount || ''),
            fontSize: 20,
            fill: COLOR.vpCardPurple,
            stroke: COLOR.vpCardPurple,
            // strokeWidth: 2,
            fontFamily: 'Calibri',
        });

        this.favorAmount = new Konva.Text({
            x: coinCenter + 5,
            y: coinCenter - 10,
            text: String(amount || ''),
            fontSize: 20,
            fill: COLOR.boneWhite,
            stroke: COLOR.boneWhite,
            // strokeWidth: 2,
            fontFamily: 'Calibri',

        });

        this.group.add(...[
            favorIcon.getElement(),
            semiDisc,
            semiWreath,
            this.vpAmount,
            this.favorAmount,
        ]);
    }

    public getDiameter(): number {
        return this.group.width();
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(amount: number | null): void {
        this.vpAmount.text(String(amount || ''));
        this.favorAmount.text(String(amount || ''));
    }
}
