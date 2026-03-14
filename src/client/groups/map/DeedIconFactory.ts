import { BubbleDeed, TradeGood } from '~/shared_types';
import clientConstants from '~/client/client_constants';
import Konva from 'konva';

const { ICON_DATA, HUES, CARGO_ITEM_DATA } = clientConstants;
export class DeedIconFactory {

    constructor() {}

    public getIcon(deed: BubbleDeed) {
        const icon = (() => {
            switch (deed) {
                case BubbleDeed.ebony:
                    return this.getCommodity('ebony');
                case BubbleDeed.gems:
                    return this.getCommodity('gems');
                case BubbleDeed.linen:
                    return this.getCommodity('linen');
                case BubbleDeed.marble:
                    return this.getCommodity('marble');
                default:
                    return this.getWave();
            }
        })();

        const debug = new Konva.Rect({
            width: 30, height: 30, stroke: 'red', strokeWidth: 2,
        });

        return new Konva.Group().add(debug, icon);
    }

    private getWave() {
        const data = ICON_DATA.ocean_wave;
        return new Konva.Path({
            data: data.shape,
            fill: data.fill,
            x: 2,
            y: -13,
            scale: { x: .5, y: 1.5 },
            stroke: 'black',
            strokeWidth: 1,
        });
    }

    private getCommodity(type: TradeGood) {
        const data = CARGO_ITEM_DATA[type];
        return new Konva.Path({
            data: data.shape,
            fill: data.fill,
            x: 8,
            y: 8,
            scale: { x: 1.2, y: 1.2 },
            stroke: 'black',
            strokeWidth: 1,
        });
    }
}