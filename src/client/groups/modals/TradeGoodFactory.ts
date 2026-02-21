import Konva from 'konva';
import { TradeGood, Unique } from '~/shared_types';
import clientConstants from '~/client_constants';
import { GroupFactory } from '~/client/client_types';

const { CARGO_ITEM_DATA } = clientConstants;

export class TradeGoodFactory implements Unique<GroupFactory> {

    constructor() {}

    public produceElement(name: TradeGood, scale: number = 2): Konva.Group {
        const { shape: data, fill } = CARGO_ITEM_DATA[name];

        return new Konva.Group().add(...[
            new Konva.Path({
                data,
                fill,
                stroke: 'white',
                strokeWidth: 1,
                scale: { x: scale, y: scale },
            }),
        ]).hide();
    }
}
