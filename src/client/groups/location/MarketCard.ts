import Konva from 'konva';
import { MarketCardUpdate, DynamicGroupInterface } from '~/client_types';
import { Coordinates, Fluctuation, Trade, Unique } from '~/shared_types';
import { CoinDial, Button } from '../popular';
import { CommodityAssortment } from '.';
import clientConstants from '~/client_constants';
import { MiniTempleRewardDial } from './MiniTempleRewardDial';
import { slideToPosition, fade } from '~/client/animations';

const { HUES } = clientConstants;
export class MarketCard extends Button implements Unique<DynamicGroupInterface<MarketCardUpdate>> {
    private coinDial: CoinDial;
    private assortment: CommodityAssortment;
    private background: Konva.Rect;
    private fluctuation: Fluctuation | null = null;
    private miniRewardDial: MiniTempleRewardDial;
    private originalPosition: Coordinates;
    private fadeOnShift: boolean;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        tradeCallback: Function | null,
        trade: Trade,
        fluctuation: Fluctuation | null,
        shouldFade: boolean,
    ) {
        super(
            stage,
            {
                width: 66,
                height: 108,
                x: position.x,
                y: position.y,
            },
            tradeCallback,
        );

        this.originalPosition = position;
        this.fluctuation = fluctuation;
        this.fadeOnShift = shouldFade;

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: HUES.marketDarkOrange,
            cornerRadius: 15,
            stroke: HUES.boneWhite,
            strokeWidth: 2,
        });

        this.coinDial = new CoinDial(
            {
                x: this.background.width() / 2,
                y: this.background.height() / 2 + 27,
            },
            trade.reward.coins + (fluctuation ?? 0),
        );

        this.assortment = new CommodityAssortment(
            { x: 0, y: -3 },
            'card',
            trade.request,
        );

        this.miniRewardDial = new MiniTempleRewardDial(
            { x: this.group.width() - 13, y: this.group.height() - 13 },
            trade.reward.favorAndVp,
        );

        this.group.add(...[
            this.background,
            this.coinDial.getElement(),
            this.assortment.getElement(),
            this.miniRewardDial.getElement(),
        ]);
    }

    public async update(data: MarketCardUpdate): Promise<void> {
        const { isFeasible, isShift, trade } = data;

        await this.animateShift(isShift);

        this.group.x(this.originalPosition.x).y(this.originalPosition.y);
        this.coinDial.update(trade.reward.coins + (this.fluctuation ?? 0));
        this.miniRewardDial.update(trade.reward.favorAndVp);
        this.assortment.update(trade.request);
        this.background.fill(isFeasible ? HUES.marketOrange : HUES.marketDarkOrange);
        this.background.stroke(isFeasible ? HUES.treasuryGold : HUES.boneWhite);
        isFeasible ? this.enable() : this.disable();

        fade(this.group, .5, 1);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    private async animateShift(isShift: boolean) {

        if(!isShift)
            return;

        if (this.fadeOnShift) {
            return await fade(this.group, 1.5, 0);
        } else {
            await slideToPosition(this.group, { x: 76, y: 28 }, 1);
            return await fade(this.group, .5, 0);;
        }
    }
}