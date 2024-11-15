import Konva from 'konva';
import { Coordinates, GoodId } from '../../shared_types';
import { DynamicGroupInterface, GroupLayoutData} from '../client_types';
import clientConstants from '../client_constants';

const { CARGO_ITEM_DATA } = clientConstants;

export class GoodsOrderDisplay implements DynamicGroupInterface<Array<GoodId>>
{
    private group: Konva.Group;
    constructor(
        layout: GroupLayoutData,
        goods: Array<GoodId>,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        const count = goods.length;

        if (count === 0 || count > 3) {
            throw new Error('Invalid number of goods in goods order display');
        }

        const goodsGroup = (): Konva.Group => {
            switch (count) {
                case 1:
                    return this.getSingleGoodGroup(goods);
                case 2:
                    return this.getDoubleGoodGroup(goods);
                default:
                    return this.getTripleGoodGroup(goods);
            }
        }

        this.group.add(
            goodsGroup()
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(goodsOrder: Array<GoodId>): void {
        console.log('Updating goods order display', goodsOrder);
    }

    private getSingleGoodGroup(goods: Array<GoodId>): Konva.Group {
        const group = new Konva.Group({
            width: this.group.width(),
            height: this.group.height(),
        });

        const goodData = CARGO_ITEM_DATA[goods[0]];
        const goodShape = new Konva.Path({
            x: this.group.width()/2 - 19,
            y: this.group.height()/2 - 10,
            data: goodData.shape,
            fill: goodData.fill,
            stroke: 'white',
            strokeWidth: 1,
            scale: {x: 1.5, y: 1.5},
        });

        group.add(
            goodShape
        );

        return group;
    }

    private getDoubleGoodGroup(goods: Array<GoodId>): Konva.Group {
        const group = new Konva.Group({
            width: this.group.width(),
            height: this.group.height(),
        });

        const doubleLayout: Array<Coordinates> = [
            {x: this.group.width()/2 - 19, y: this.group.height()/2 - 20},
            {x: this.group.width()/2 - 19, y: this.group.height()/2 + 10},
        ]

        goods.forEach((good, index) => {
            const goodData = CARGO_ITEM_DATA[good];
            const layout = doubleLayout[index];
            const goodShape = new Konva.Path({
                x: layout.x,
                y: layout.y,
                data: goodData.shape,
                fill: goodData.fill,
                stroke: 'white',
                strokeWidth: 1,
                scale: {x: 1.5, y: 1.5},
            });

            group.add(
                goodShape
            );
        });

        return group;
    }

    private getTripleGoodGroup(goods: Array<GoodId>): Konva.Group {
        const group = new Konva.Group({
            width: this.group.width(),
            height: this.group.height(),
        });

        const tripleLayout: Array<Coordinates> = [
            {x: this.group.width()/2 - 35, y: this.group.height()/2 - 20},
            {x: this.group.width()/2 - 5, y: this.group.height()/2 - 20},
            {x: this.group.width()/2 - 19, y: this.group.height()/2 + 10},
        ]

        goods.forEach((good, index) => {
            const goodData = CARGO_ITEM_DATA[good];
            const layout = tripleLayout[index];
            const goodShape = new Konva.Path({
                x: layout.x,
                y: layout.y,
                data: goodData.shape,
                fill: goodData.fill,
                stroke: 'white',
                strokeWidth: 1,
                scale: {x: 1.5, y: 1.5},
            });

            group.add(
                goodShape
            );
        });

        return group;
    }
}