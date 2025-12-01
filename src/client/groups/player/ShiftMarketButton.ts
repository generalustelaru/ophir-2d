import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import { Button } from '../popular';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;

export class ShiftMarketButton extends Button implements Unique<DynamicGroupInterface<boolean>> {

    private card: Konva.Rect;
    private coin: Konva.Circle;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        endRivalTurnCallback: ((p: boolean) => void) | null,
    ) {
        super(
            stage,
            { x: position.x, y: position.y, width: 50, height: 81 },
            endRivalTurnCallback,
        );

        this.card = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.marketDarkOrange,
            cornerRadius: 11,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });

        this.coin = new Konva.Circle({
            x: this.group.width() / 2,
            y: this.group.height() / 3 * 2,
            radius: 15,
            border: 1,
            borderFill: 'black',
            fill: COLOR.coinSilver,
        });

        this.group.add(...[
            this.card,
            this.coin,
        ]);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(mayShift: boolean) {
        this.card.fill(mayShift ? COLOR.marketOrange : COLOR.marketDarkOrange);
        mayShift ? this.enable() : this.disable();
    }
}