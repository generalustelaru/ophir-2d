import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { Action, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState } from "~/shared_types";
import { CoinDial, GoodsAssortment } from "../GroupList";
import { ModalInterface } from "~/client_types";
import clientConstants from "~/client_constants";

const { ICON_DATA } = clientConstants;

export class SellGoodsModal extends ModalBase implements ModalInterface<PlayState, MarketSlotKey>{
    // private playerCargo: Array<ItemName> = [];
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private coinDial: CoinDial;
    private goodsAssortment: GoodsAssortment;
    // private cargoItemLayout: Array<Coordinates>;

    constructor(stage: Konva.Stage) {
        super(stage, { hasSubmit: true, actionMessage: null });

        this.goodsAssortment = new GoodsAssortment(
            { x: 50, y: 20 },
            null,
        );

        const {shape, fill} = ICON_DATA['conversion_arrow'];
        const conversionArrow = new Konva.Path({
            data: shape,
            fill: fill,
            scale: {x: 3, y:3},
            x: this.contentGroup.width() / 2 - 25,
            y: this.contentGroup.height() / 2 - 5,
        });

        this.coinDial = new CoinDial(
            {
                x: this.contentGroup.width() - 75,
                y: this.contentGroup.height() / 2,
            },
            0,
        );

        this.contentGroup.add(...[
            this.goodsAssortment.getElement(),
            conversionArrow,
            this.coinDial.getElement()]
        );
    }

    public update(state: PlayState) {
        this.market = state.market
        this.fluctuations = state.setup.marketFluctuations;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            throw new Error("Cannot render modal! Update data is missing.");

        this.coinDial.update(this.market[slot].reward.coins  + this.fluctuations[slot]);
        this.goodsAssortment.update(this.market[slot].request);
        this.open({ action: Action.sell_goods, payload: { slot } });
    }
}