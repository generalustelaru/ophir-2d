import Konva from "konva";
import { MarketCardUpdate, DynamicGroupInterface } from "~/client_types";
import { Coordinates, Trade, ClientMessage } from "~/shared_types";
import { GoodsAssortment, TempleRewardDial } from "../GroupList";
import clientConstants from "~/client_constants";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;
export class TempleMarketCard extends ActionButton implements DynamicGroupInterface<MarketCardUpdate> {

    private rewardDial: TempleRewardDial;
    private goodsAssortment: GoodsAssortment;
    private background: Konva.Rect;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        message: ClientMessage | null,
        trade: Trade,
    ) {
        super(
            stage,
            {
                width: 66,
                height: 128,
                x: position.x,
                y: position.y,
            },
            message
        );

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

    public update(data: MarketCardUpdate): void {
        this.rewardDial.update(data.trade.reward.favorAndVp);
        this.goodsAssortment.update(data.trade.request);
        this.background.fill(data.isFeasible ? COLOR.templeBlue : COLOR.templeDarkBlue);
        this.background.stroke(data.isFeasible ? COLOR.treasuryGold : COLOR.boneWhite);
        this.setEnabled(data.isFeasible);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}