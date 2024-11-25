import Konva from "konva";
import { ActionEventPayload, MarketCardUpdate, DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { Trade } from "../../../shared_types";
import { GoodsAssortment, TempleRewardDial } from "../GroupList";
import clientConstants from "../../client_constants";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;
export class TempleCard extends ActionButton implements DynamicGroupInterface<MarketCardUpdate> {

    private rewardDial: TempleRewardDial;
    private goodsAssortment: GoodsAssortment;
    private background: Konva.Rect;
    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        actionPayload: ActionEventPayload | null,
        trade: Trade,
    ) {
        super(stage, layout, actionPayload);

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeDarkBlue,
            cornerRadius: 15,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });
        console.dir(layout);

        this.rewardDial = new TempleRewardDial(
            { x: 0, y: 0 },
            trade.reward.favorAndVp
        );
        this.rewardDial.getElement().x((this.background.width() - this.rewardDial.getDiameter()) / 2);
        this.rewardDial.getElement().y(this.background.height() - this.rewardDial.getDiameter() - 30);

        this.goodsAssortment = new GoodsAssortment(
            {
                width: this.group.width(),
                height: this.group.width(),
                x: 0,
                y: 0,
            },
            trade.request
        );

        this.group.add(...[
            this.background,
            this.rewardDial.getElement(),
            this.goodsAssortment.getElement(),
        ]);
    }

    public updateElement(data: MarketCardUpdate): void {
        this.rewardDial.updateElement(data.trade.reward.favorAndVp);
        this.goodsAssortment.updateElement(data.trade.request);
        this.background.fill(data.isFeasible ? COLOR.templeBlue : COLOR.templeDarkBlue);
        this.background.stroke(data.isFeasible ? COLOR.exchangeGold : COLOR.boneWhite);
        this.setEnabled(data.isFeasible);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}