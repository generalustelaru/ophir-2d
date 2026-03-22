import Konva from 'konva';
import { MarketCardUpdate, DynamicGroupInterface, ElementList } from '~/client_types';
import { Coordinates, Trade, Unique } from '~/shared_types';
import { Button } from '../popular';
import { CommodityAssortment, TempleRewardDial } from '.';
import { fade } from '~/client/animations';
import clientConstants from '~/client_constants';

const { HUES } = clientConstants;
export class TempleMarketCard extends Button implements Unique<DynamicGroupInterface<MarketCardUpdate>> {

    private rewardDial: TempleRewardDial;
    private assortment: CommodityAssortment;
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
            fill: HUES.templeDarkBlue,
            cornerRadius: 15,
            stroke: HUES.boneWhite,
            strokeWidth: 2,
        });

        this.rewardDial = new TempleRewardDial(
            { x: this.group.width() / 2 - 5, y: this.group.height() - 30 },
            opensAdvisorModal ? null : trade.reward.favorAndVp,
        );

        this.assortment = new CommodityAssortment(
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
            this.assortment.getElement(),
        ];

        opensAdvisorModal && elements.push(new Konva.Text({
            text: '...',
            width: this.group.width(),
            align: 'center',
            y: 15,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
            fill: HUES.boneWhite,
        }));

        this.group.add(...elements);
    }

    public async update(data: MarketCardUpdate): Promise<void> {
        const { trade, isShift, isFeasible } = data;

        isShift && await fade(this.group, 1.5, 0);

        this.rewardDial.update(this.opensModal ? null : trade.reward.favorAndVp);
        this.assortment.update(this.opensModal ? null : trade.request);
        isFeasible ? this.enable() : this.disable();

        isShift && fade(this.group, .5, 1);
    }

    public enable(): void {
        this.background.fill(HUES.templeBlue);
        this.background.stroke(HUES.treasuryGold);
        super.enable();
    }
    public disable(): void {
        this.background.fill(HUES.templeDarkBlue);
        this.background.stroke(HUES.boneWhite);
        super.disable();
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}