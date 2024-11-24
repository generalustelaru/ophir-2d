import Konva from "konva";
import { ActionEventPayload, MarketCardUpdate, DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { Trade } from "../../../shared_types";
import { CoinDial, GoodsAssortment } from "../GroupList";
import clientConstants from "../../client_constants";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;
export class MarketCard extends ActionButton implements DynamicGroupInterface<MarketCardUpdate> {

    private coinDial: CoinDial;
    private goodsAssortment: GoodsAssortment;
    private background: Konva.Rect;
    private fluctuation: number | null = null;
    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        actionPayload: ActionEventPayload | null,
        trade: Trade,
        fluctuation: number | null = null,
    ) {
        super(stage, layout, actionPayload);

        this.fluctuation = fluctuation;

        this.background = new Konva.Rect({
            width: this.group.width() - 6,
            height: this.group.height() - 6,
            x: 3,
            y: 3,
            fill: COLOR.marketDarkOrange,
            cornerRadius: 15,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });

        this.coinDial = new CoinDial(
            { x: 38, y: 90 },
            trade.reward.coins + (fluctuation ?? 0)
        );

        this.goodsAssortment = new GoodsAssortment(
            {
                width: this.background.width(),
                height: this.background.height() - this.coinDial.getElement().height() - this.coinDial.getElement().y() - 20,
                x: this.background.x(),
                y: 15,
            },
            trade.request
        );

        this.group.add(...[
            this.background,
            this.coinDial.getElement(),
            this.goodsAssortment.getElement(),
        ]);
    }

    public updateElement(data: MarketCardUpdate): void {
        this.coinDial.updateElement(data.trade.reward.coins + (this.fluctuation ?? 0));
        this.goodsAssortment.updateElement(data.trade.request);
        this.background.fill(data.isFeasible ? COLOR.marketOrange : COLOR.marketDarkOrange);
        this.background.stroke(data.isFeasible ? COLOR.exchangeGold : COLOR.boneWhite);
        this.setEnabled(data.isFeasible);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}