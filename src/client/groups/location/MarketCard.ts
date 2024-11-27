import Konva from "konva";
import { ActionEventPayload, MarketCardUpdate, DynamicGroupInterface } from "../../client_types";
import { Coordinates, Fluctuation, Trade } from "../../../shared_types";
import { CoinDial, GoodsAssortment } from "../GroupList";
import clientConstants from "../../client_constants";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;
export class MarketCard extends ActionButton implements DynamicGroupInterface<MarketCardUpdate> {

    private coinDial: CoinDial;
    private goodsAssortment: GoodsAssortment;
    private background: Konva.Rect;
    private fluctuation: Fluctuation | null = null;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        actionPayload: ActionEventPayload | null,
        trade: Trade,
        fluctuation: Fluctuation | null = null,
    ) {
        super(
            stage,
            {
                width: 66,
                height: 128,
                x: position.x,
                y: position.y,
            },
            actionPayload
        );

        this.fluctuation = fluctuation;

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.marketDarkOrange,
            cornerRadius: 15,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });

        this.coinDial = new CoinDial(
            {
                x: this.background.width() / 2,
                y: this.background.height() / 2 + 20,
            },
            trade.reward.coins + (fluctuation ?? 0)
        );

        this.goodsAssortment = new GoodsAssortment(
            {
                width: this.background.width(),
                height: this.background.width(),
                x: 0,
                y: 0,
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
        this.background.stroke(data.isFeasible ? COLOR.treasuryGold : COLOR.boneWhite);
        this.setEnabled(data.isFeasible);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}