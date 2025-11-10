import Konva from 'konva';
import { Coordinates, TradeGood, Unique } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import clientConstants from '~/client_constants';

const { CARGO_ITEM_DATA } = clientConstants;

type Scale = 'card' | 'modal'
export class GoodsAssortment implements Unique<DynamicGroupInterface<Array<TradeGood>>>
{
    private group: Konva.Group;
    private scale: number;
    constructor(
        position: Coordinates,
        scale: Scale,
        goods: Array<TradeGood> | null,
    ) {
        this.scale = (() => { switch (scale) {
            case 'modal': return 2;
            case 'card': return 1.5;
            default:  throw new Error('Cannot determine Scale value.');
        }})();

        this.group = new Konva.Group({
            width: 66,
            height: 66,
            x: position.x,
            y: position.y,
        });

        goods && this.group.add( this.getGoodsGroup(goods));
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(goods: Array<TradeGood> | null): void {
        this.group.destroyChildren();
        goods && this.group.add(this.getGoodsGroup(goods));
    }

    private getGoodsGroup(goods: Array<TradeGood>): Konva.Group {
        const count = goods.length;

        switch (count) {
            case 1:
                return this.getSingleGoodGroup(goods);
            case 2:
                return this.getDoubleGoodGroup(goods);
            case 3:
                return this.getTripleGoodGroup(goods);
            default:
                throw new Error('Invalid number of goods in goods order display');
        }
    }

    private getSingleGoodGroup(goods: Array<TradeGood>): Konva.Group {
        const group = new Konva.Group({
            width: this.group.width(),
            height: this.group.height(),
        });

        const goodData = CARGO_ITEM_DATA[goods[0]];
        const goodShape = new Konva.Path({
            x: this.group.width() / 2 - 9,
            y: this.group.height() / 2 - 9,
            data: goodData.shape,
            fill: goodData.fill,
            stroke: 'white',
            strokeWidth: 1,
            scale: { x: this.scale, y: this.scale },
        });

        group.add(
            goodShape,
        );

        return group;
    }

    private getDoubleGoodGroup(goods: Array<TradeGood>): Konva.Group {
        const group = new Konva.Group({
            width: this.group.width(),
            height: this.group.height(),
        });

        const doubleLayout: Array<Coordinates> = [
            { x: this.group.width()/2 - 9, y: this.group.height()/2 - 21 },
            { x: this.group.width()/2 - 9, y: this.group.height()/2 + 6 },
        ];

        goods.forEach((tradeGood, index) => {
            const goodData = CARGO_ITEM_DATA[tradeGood];
            const layout = doubleLayout[index];
            const goodShape = new Konva.Path({
                x: layout.x,
                y: layout.y,
                data: goodData.shape,
                fill: goodData.fill,
                stroke: 'white',
                strokeWidth: 1,
                scale: { x: this.scale, y: this.scale },
            });

            group.add(
                goodShape,
            );
        });

        return group;
    }

    private getTripleGoodGroup(goods: Array<TradeGood>): Konva.Group {
        const group = new Konva.Group({
            width: this.group.width(),
            height: this.group.height(),
        });

        const tripleLayout: Array<Coordinates> = [
            { x: this.group.width()/2 - 24, y: this.group.height()/2 - 21 },
            { x: this.group.width()/2 + 6, y: this.group.height()/2 - 21 },
            { x: this.group.width()/2 - 9, y: this.group.height()/2 + 6 },
        ];

        goods.forEach((tradeGood, index) => {
            const goodData = CARGO_ITEM_DATA[tradeGood];
            const layout = tripleLayout[index];
            const goodShape = new Konva.Path({
                x: layout.x,
                y: layout.y,
                data: goodData.shape,
                fill: goodData.fill,
                stroke: 'white',
                strokeWidth: 1,
                scale: { x: this.scale, y: this.scale },
            });

            group.add(
                goodShape,
            );
        });

        return group;
    }
}