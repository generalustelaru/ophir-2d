import Konva from 'konva';
import { MarketCardUpdate, DynamicGroupInterface } from '~/client_types';
import { Coordinates, Trade, Unique } from '~/shared_types';
import { Button } from '../popular';
import { GoodsAssortment, TempleRewardDial } from '.';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;
export class TempleMarketCard extends Button implements Unique<DynamicGroupInterface<MarketCardUpdate>> {

    private rewardDial: TempleRewardDial;
    private goodsAssortment: GoodsAssortment;
    private background: Konva.Rect;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        trade: Trade,
        callback: Function,
    ) {
        super(
            stage,
            {
                width: 66,
                height: 128,
                x: position.x,
                y: position.y,
            },
            callback,
        );

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeDarkRed,
            cornerRadius: 15,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });

        this.rewardDial = new TempleRewardDial(
            { x: 0, y: 0 },
            trade.reward.favorAndVp,
        );
        this.rewardDial.getElement().x((this.background.width() - this.rewardDial.getDiameter()) / 2);
        this.rewardDial.getElement().y(this.background.height() - this.rewardDial.getDiameter() - 30);

        this.goodsAssortment = new GoodsAssortment(
            {
                x: 0,
                y: 0,
            },
            'card',
            trade.request,
        );

        this.group.add(...[
            this.background,
            this.rewardDial.getElement(),
            this.goodsAssortment.getElement(),
        ]);
    }

    public update(data: MarketCardUpdate): void {
        this.rewardDial.update(data.trade.reward.favorAndVp);
        this.goodsAssortment.update(data.trade.request);
        this.background.fill(data.isFeasible ? COLOR.templeRed : COLOR.templeDarkRed);
        this.background.stroke(data.isFeasible ? COLOR.treasuryGold : COLOR.boneWhite);
        data.isFeasible ? this.enable() : this.disable();
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}