import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '../client_types';
import clientConstants from '../client_constants';

const { COLOR } = clientConstants;

export class ExchangeCard implements DynamicGroupInterface<any> {

    private group: Konva.Group;
    private background: Konva.Rect;

    constructor(
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x + 10,
            y: layout.y + 10,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.exchangeGold,
            stroke: 'white',
            cornerRadius: 15,
            strokeWidth: 3,
        });

        this.group.add(
            this.background,
        );
    }

    public updateElement(arg: any): void {
        console.log('MarketCard.updateElement', arg);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}