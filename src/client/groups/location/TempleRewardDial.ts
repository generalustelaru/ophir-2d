import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import { FavorIcon, VictoryPointDial } from '../popular';
import clientConstants from '~/client_constants';

const { HUES } = clientConstants;

export class TempleRewardDial implements Unique<DynamicGroupInterface<number>> {
    private group: Konva.Group;
    private vpDial: VictoryPointDial;
    private favorAmount: Konva.Text;
    constructor(
        position: Coordinates,
        amount: number | null,
    ) {
        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
            width: 66,
            height: 66,
        });

        this.vpDial = new VictoryPointDial(
            { x: -30, y: -35 },
        );
        amount && this.vpDial.update(amount);

        const favorIcon = new FavorIcon({ x: 10, y: -15 }, 'small');

        this.favorAmount = new Konva.Text({
            x: 20,
            y: -10,
            text: String(amount || ''),
            fontSize: 15,
            fill: HUES.boneWhite,
            stroke: HUES.boneWhite,
            fontFamily: 'Calibri',

        });

        this.group.add(
            this.vpDial.getElement(),
            favorIcon.getElement(),
            this.favorAmount,
        );
    }

    public getDiameter(): number {
        return this.group.width();
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(amount: number | null): void {
        amount && this.vpDial.update(amount);
        this.favorAmount.text(String(amount || ''));
    }
}
