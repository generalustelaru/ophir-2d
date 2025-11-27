import Konva from 'konva';
import { Coordinates, TradeGood, Unique } from '~/shared_types';
import { DynamicGroupInterface, ElementList } from '~/client_types';
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

    private getGoodsGroup(commodities: Array<TradeGood>): Konva.Group {
        const cX = this.group.width() / 2;
        const cY = this.group.height() / 2;
        const layouts: Record<number, Coordinates[]> = {
            1: [
                { x: cX - 9, y: cY - 9 },
            ],
            2: [
                { x: cX - 9, y: cY - 21 },
                { x: cX - 9, y: cY + 6 },
            ],
            3: [
                { x: cX - 24, y: cY - 21 },
                { x: cX + 6, y: cY - 21 },
                { x: cX - 9, y: cY + 6 },
            ],
        };
        const layout = layouts[commodities.length];

        const elements: ElementList = commodities.map((commodity, index) => {
            const path = new Konva.Path({
                x: layout[index].x,
                y: layout[index].y,
                data: CARGO_ITEM_DATA[commodity].shape,
                fill: CARGO_ITEM_DATA[commodity].fill,
                stroke: 'white',
                strokeWidth: 1,
                scale: { x: this.scale, y: this.scale },
            });

            return path;
        });

        return new Konva.Group({
            width: this.group.width(),
            height: this.group.height(),
        }).add(...elements);
    }
}