import Konva from 'konva';
import { MarketCardUpdate, DynamicGroupInterface, ElementList } from '~/client_types';
import { Coordinates, Trade, Unique } from '~/shared_types';
import { Button } from '../popular';
import { GoodsAssortment, TempleRewardDial } from '.';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;
export class TempleMarketCard extends Button implements Unique<DynamicGroupInterface<MarketCardUpdate>> {

    private rewardDial: TempleRewardDial;
    private goodsAssortment: GoodsAssortment;
    private background: Konva.Rect;
    private opensModal: boolean;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        trade: Trade,
        opensAdvisorModal: boolean,
        callback: Function | null,
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

        this.opensModal = opensAdvisorModal;

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeDarkBlue,
            cornerRadius: 15,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });

        this.rewardDial = new TempleRewardDial(
            { x: 0, y: 0 },
            opensAdvisorModal ? null : trade.reward.favorAndVp,
        );
        this.rewardDial.getElement().x((this.background.width() - this.rewardDial.getDiameter()) / 2);
        this.rewardDial.getElement().y(this.background.height() - this.rewardDial.getDiameter() - 30);

        this.goodsAssortment = new GoodsAssortment(
            {
                x: 0,
                y: 0,
            },
            'card',
            opensAdvisorModal ? null : trade.request,
        );

        const elements: ElementList = [
            this.background,
            this.rewardDial.getElement(),
            this.goodsAssortment.getElement(),
        ];

        opensAdvisorModal && elements.push(new Konva.Text({
            text: '...',
            width: this.group.width(),
            align: 'center',
            y: 15,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
            fill: COLOR.boneWhite,
        }));

        this.group.add(...elements);
    }

    public update(data: MarketCardUpdate): void {
        this.rewardDial.update(this.opensModal ? null : data.trade.reward.favorAndVp);
        this.goodsAssortment.update(this.opensModal ? null : data.trade.request);
        this.background.fill(data.isFeasible ? COLOR.templeBlue : COLOR.templeDarkBlue);
        this.background.stroke(data.isFeasible ? COLOR.treasuryGold : COLOR.boneWhite);
        data.isFeasible ? this.enable() : this.disable();
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}