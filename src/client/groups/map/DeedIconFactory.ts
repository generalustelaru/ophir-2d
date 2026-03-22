import { BubbleDeed, Metal, Commodity } from '~/shared_types';
import clientConstants from '~/client_constants';
import Konva from 'konva';
import { Dimensions } from '~/client_types';

const { ICON_DATA, HUES, CARGO_ITEM_DATA, LOCATION_TOKEN_DATA } = clientConstants;
export class DeedIconFactory {
    private readonly unit: Dimensions;
    constructor(unit: Dimensions) {
        this.unit = unit;
    }

    public getIcon(deed: BubbleDeed) {
        const icon = (() => {
            switch (deed) {
                case BubbleDeed.move:
                    return this.getHexIcon();
                case BubbleDeed.rollMove:
                case BubbleDeed.rollFail:
                    return this.getDieIcon(deed);
                case BubbleDeed.ebony:
                case BubbleDeed.gems:
                case BubbleDeed.linen:
                case BubbleDeed.marble:
                    return this.getCommodityIcon(deed);
                case BubbleDeed.gold:
                case BubbleDeed.silver:
                    return this.getMetalIcon(deed);
                case BubbleDeed.privilege:
                    return this.getPrivilegeIcon();
                case BubbleDeed.coin:
                    return this.getCoinIcon();
                case BubbleDeed.marketCoin:
                case BubbleDeed.marketRival:
                    return this.getMarketIcon(deed);
                case BubbleDeed.rival:
                    return this.getRivalCharacter();
                case BubbleDeed.metalVp:
                case BubbleDeed.vpFavor:
                    return this.getVpIcon(deed);
                case BubbleDeed.upgrade:
                    return this.getUpgradeIcon();
                case BubbleDeed.undecided:
                    return this.produceCharacter('(0_0)', { emoji: true });
                case BubbleDeed.idle:
                    return this.produceCharacter('(-_-)zZ', { emoji: true });
                default:
                    return new Konva.Group();
            }
        })();

        return new Konva.Group().add(icon);
    }

    private getHexIcon() {
        return new Konva.RegularPolygon({
            sides: 6,
            radius: 13,
            fill: HUES.activeHex,
            x: 15,
            y: 15,
            stroke: 'black',
            strokeWidth: 1,
        });
    }

    private getCommodityIcon(
        deed:
            | BubbleDeed.ebony
            | BubbleDeed.gems
            | BubbleDeed.linen
            | BubbleDeed.marble,
    ) {
        const type = ((): Commodity => {
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

    private getDieIcon(deed: BubbleDeed.rollMove | BubbleDeed.rollFail) {
        const hex = this.getHexIcon();
        const face = new Konva.Rect({
            width: 18,
            height: 18,
            cornerRadius: 3,
            x: 6,
            y: 6,
            fill: HUES.Neutral,
            stroke: 'black',
            strokeWidth: 1,
        });
        const pip = new Konva.Circle({
            radius: 3,
            x: 15,
            y: 15,
            fill: 'black',
        });

        if (deed == BubbleDeed.rollFail) {
            face.fill(HUES.highRoll);
            pip.fill('white');
        }

        const roll = new Konva.Group().add(hex, face, pip);

        return roll;
    }

    private getMetalIcon(deed: BubbleDeed.silver | BubbleDeed.gold) {
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

    private getPrivilegeIcon() {
        const stamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_outer.shape,
            fill: ICON_DATA.favor_stamp_outer.fill,
            stroke: HUES.stampEdge,
            strokeWidth: 2,
            scale: { x: .8, y: .8 },
            x: 5,
            y: 5,
        });

        const check = new Konva.Path({
            data: ICON_DATA.active_favor_check.shape,
            fill: ICON_DATA.active_favor_check.fill,
            scale: { x: 1.2, y: 1.2 },
            y: -5,
        });

        return new Konva.Group().add(stamp, check);
    }

    private getCoinIcon() {
        const coinTop = new Konva.Circle({
            radius: 7,
            y: -1,
            border: 1,
            borderFill: 'black',
            fill: HUES.coinSilver,
        });
        const coinSide = new Konva.Circle({
            radius: 7,
            fill: 'black',
        });

        return new Konva.Group({ x: 15, y: 15 }).add(coinSide, coinTop);
    }

    private getMarketIcon(deed: BubbleDeed.marketCoin | BubbleDeed.marketRival) {
        const card = this.produceCardShape(LOCATION_TOKEN_DATA.market.fill);
        const icon = deed == BubbleDeed.marketCoin ? this.getCoinIcon() : this.getRivalCharacter();

        return new Konva.Group().add(card, icon);
    }

    private getVpIcon(deed: BubbleDeed.metalVp | BubbleDeed.vpFavor) {
        const card = this.produceCardShape(LOCATION_TOKEN_DATA.temple.fill);
        const vpDisc = new Konva.Circle({
            x: 15,
            y: 15,
            radius: 7,
            fill: HUES.vpGold,
        });

        if (deed == BubbleDeed.metalVp) {
            return new Konva.Group().add(card, vpDisc);
        }

        const favorSemiDisc = new Konva.Wedge({
            x: 15,
            y: 15,
            radius: 7,
            angle: 180,
            rotation: -90,
            fill: ICON_DATA.favor_stamp_outer.fill,
        });

        return new Konva.Group().add(card,vpDisc, favorSemiDisc);
    }

    private getRivalCharacter() {
        return this.produceCharacter('R');
    }

    private getUpgradeIcon() {
        const card = this.produceCardShape('black');
        const sign = this.produceCharacter('+', { hue: 'white' });

        return new Konva.Group().add(card, sign);
    }

    private produceCardShape(hue: string) {
        return new Konva.Rect({
            width: 18,
            height: 22,
            x: 6,
            y: 4,
            cornerRadius: 3,
            fill: hue,
            stroke: 'black',
            strokeWidth: 1,
        });
    }

    private produceCharacter(char: string, options?: { hue?: string, emoji?: boolean }) {
        return new Konva.Text({
            text: char,
            width: this.unit.width,
            height: this.unit.height,
            fill: options?.hue,
            fontFamily: options?.emoji ? 'monospace' : 'Custom',
            fontSize: options?.emoji ? 10 : 16,
            fontStyle: 'bold',
            align: 'center',
            wrap: 'none',
            verticalAlign: 'middle',
            y: options?.emoji ? 0 : 2,
        });
    }
}
