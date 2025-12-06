import Konva from 'konva';
import { MarketCardUpdate, DynamicGroupInterface } from '~/client_types';
import { Coordinates, Fluctuation, Trade, Unique } from '~/shared_types';
import { CoinDial, Button } from '../popular';
import { GoodsAssortment } from '.';
import clientConstants from '~/client_constants';
import { MiniTempleRewardDial } from './MiniTempleRewardDial';

const { HUES } = clientConstants;
export class MarketCard extends Button implements Unique<DynamicGroupInterface<MarketCardUpdate>> {
    private coinDial: CoinDial;
    private goodsAssortment: GoodsAssortment;
    private background: Konva.Rect;
    private fluctuation: Fluctuation | null = null;
    private miniRewardDial: MiniTempleRewardDial;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        tradeCallback: Function | null,
        trade: Trade,
        fluctuation: Fluctuation | null,
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

        this.fluctuation = fluctuation;

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

        this.goodsAssortment = new GoodsAssortment(
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
            this.goodsAssortment.getElement(),
            this.miniRewardDial.getElement(),
        ]);
    }

    public update(data: MarketCardUpdate): void {
        this.coinDial.update(data.trade.reward.coins + (this.fluctuation ?? 0));
        this.miniRewardDial.update(data.trade.reward.favorAndVp);
        this.goodsAssortment.update(data.trade.request);
        this.background.fill(data.isFeasible ? HUES.marketOrange : HUES.marketDarkOrange);
        this.background.stroke(data.isFeasible ? HUES.treasuryGold : HUES.boneWhite);
        data.isFeasible ? this.enable() : this.disable();
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}