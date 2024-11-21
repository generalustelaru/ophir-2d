import Konva from "konva";
import { ActionEventPayload, MarketCardUpdate, DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { TradeOffer } from "../../../shared_types";
import { CoinDial, GoodsAssortment } from "../GroupList";
import clientConstants from "../../client_constants";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;
export class TempleCard extends ActionButton implements DynamicGroupInterface<MarketCardUpdate> {

    private coinDial: CoinDial;
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

        this.coinDial = new CoinDial(
            { x: 38, y: 35 },
            contract.reward.favorAndVp
        );

        this.goodsAssortment = new GoodsAssortment(
            {
                width: this.background.width(),
                height: this.background.height() - this.coinDial.getElement().height() - this.coinDial.getElement().y() - 20,
                x: this.background.x(),
                y: this.coinDial.getElement().y() + this.coinDial.getElement().height() + 10,
            },
            contract.request
        );

        this.group.add(...[
            this.background,
            this.coinDial.getElement(),
            this.goodsAssortment.getElement(),
        ]);
    }

    public updateElement(data: MarketCardUpdate): void {
        this.coinDial.updateElement(data.contract.reward.favorAndVp);
        this.goodsAssortment.updateElement(data.contract.request);
        this.background.fill(data.isFeasible ? COLOR.templeBlue : COLOR.templeDarkBlue);
        this.background.stroke(data.isFeasible ? COLOR.exchangeGold : COLOR.boneWhite);
        this.setEnabled(data.isFeasible);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}