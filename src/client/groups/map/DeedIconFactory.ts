import { BubbleDeed, Metal, TradeGood } from '~/shared_types';
import clientConstants from '~/client/client_constants';
import Konva from 'konva';

const { ICON_DATA, HUES, CARGO_ITEM_DATA } = clientConstants;
export class DeedIconFactory {

    constructor() {}

    public getIcon(deed: BubbleDeed) {
        const icon = (() => {
            switch (deed) {
                case BubbleDeed.move:
                    return this.getWave();
                case BubbleDeed.rollMove:
                case BubbleDeed.rollFail:
                    return this.getRoll(deed);
                case BubbleDeed.ebony:
                case BubbleDeed.gems:
                case BubbleDeed.linen:
                case BubbleDeed.marble:
                    return this.getCommodity(deed);
                case BubbleDeed.gold:
                case BubbleDeed.silver:
                    return this.getMetal(deed);
                case BubbleDeed.privilege:
                case BubbleDeed.coin:
                case BubbleDeed.vpFavor:
                default:
                    return new Konva.Group();
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

    private getCommodity(
        deed:
        | BubbleDeed.ebony
        | BubbleDeed.gems
        | BubbleDeed.linen
        | BubbleDeed.marble,
    ) {
        const type = ((): TradeGood => {
            switch (deed) {
                case BubbleDeed.ebony: return 'ebony';
                case BubbleDeed.gems: return 'gems';
                case BubbleDeed.linen: return 'linen';
                case BubbleDeed.marble: return 'marble';
            }
        })();
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

    private getRoll(deed: BubbleDeed.rollMove | BubbleDeed.rollFail) {
        const face = new Konva.Rect({
            width: 18,
            height: 18,
            cornerRadius: 3,
            fill: HUES.Neutral,
            stroke: 'black',
            strokeWidth: 1,
        });
        const pip = new Konva.Circle({
            radius: 3,
            x: 9,
            y: 9,
            fill: 'black',
        });

        if (deed == BubbleDeed.rollFail) {
            face.fill(HUES.highRoll);
            pip.fill('white');
        }

        const roll = new Konva.Group({ x: 6, y: 6 }).add(face, pip);

        return roll;
    }

    private getMetal(deed: BubbleDeed.silver | BubbleDeed.gold) {
        const type: Metal = deed == BubbleDeed.gold ? 'gold' : 'silver';
        const data = CARGO_ITEM_DATA[type];
        return new Konva.Path({
            data: data.shape,
            fill: data.fill,
            x: 6,
            y: 8,
            scale: { x: .8, y: 1.2 },
            stroke: 'black',
            strokeWidth: 1,
        });
    }

}