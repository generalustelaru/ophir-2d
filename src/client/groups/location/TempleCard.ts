import Konva from "konva";
import { ActionEventPayload, MarketCardUpdate, DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { TradeOffer } from "../../../shared_types";
import { GoodsAssortment, TempleRewardDial } from "../GroupList";
import clientConstants from "../../client_constants";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;
export class TempleCard extends ActionButton implements DynamicGroupInterface<MarketCardUpdate> {

    private dial: TempleRewardDial;
    private goodsAssortment: GoodsAssortment;
    private background: Konva.Rect;
    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        actionPayload: ActionEventPayload | null,
        contract: TradeOffer,
    ) {
        super(stage, layout, actionPayload);

        this.background = new Konva.Rect({
            width: this.group.width() - 6,
            height: this.group.height() - 6,
            x: 3,
            y: 3,
            fill: COLOR.templeDarkBlue,
            cornerRadius: 15,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });

        this.dial = new TempleRewardDial(
            { x: 38, y: 35 },
            contract.reward.favorAndVp
        );

        this.goodsAssortment = new GoodsAssortment(
            {
                width: this.background.width(),
                height: this.background.height() - this.dial.getElement().height() - this.dial.getElement().y() - 20,
                x: this.background.x(),
                y: this.dial.getElement().y() + this.dial.getElement().height() + 10,
            },
            contract.request
        );

        this.group.add(...[
            this.background,
            this.dial.getElement(),
            this.goodsAssortment.getElement(),
        ]);
    }

    public updateElement(data: MarketCardUpdate): void {
        this.dial.updateElement(data.contract.reward.favorAndVp);
        this.goodsAssortment.updateElement(data.contract.request);
        this.background.fill(data.isFeasible ? COLOR.templeBlue : COLOR.templeDarkBlue);
        this.background.stroke(data.isFeasible ? COLOR.exchangeGold : COLOR.boneWhite);
        this.setEnabled(data.isFeasible);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}