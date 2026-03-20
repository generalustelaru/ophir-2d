import Konva from 'konva';
import { Coordinates, Commodity, Unique } from '~/shared_types';
import { DynamicGroupInterface, ElementList } from '~/client_types';
import clientConstants from '~/client_constants';

const { CARGO_ITEM_DATA } = clientConstants;

type Scale = 'card' | 'modal'
export class CommodityAssortment implements Unique<DynamicGroupInterface<Array<Commodity>>>
{
    private group: Konva.Group;
    private scale: number;
    constructor(
        position: Coordinates,
        scale: Scale,
        commodities: Array<Commodity> | null,
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

        commodities && this.group.add( this.getCommodityGroup(commodities));
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(commodities: Array<Commodity> | null): void {
        this.group.destroyChildren();
        commodities && this.group.add(this.getCommodityGroup(commodities));
    }

    private getCommodityGroup(commodities: Array<Commodity>): Konva.Group {
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