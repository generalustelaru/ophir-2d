import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { MarketOffer, PlayState, MarketSlotKey, Action } from "~/shared_types";
import { GoodsAssortment } from "../GroupList";
import clientConstants from "~/client_constants";

const { ICON_DATA } = clientConstants;

export class DonateGoodsModal extends ModalBase {
    private market: MarketOffer | null = null;
    private goodsAssortment: GoodsAssortment;

    constructor(stage: Konva.Stage) {
        super(stage, { hasSubmit: true, actionMessage: null });

        this.goodsAssortment = new GoodsAssortment(
            { x: 60, y: 20 },
            null,
        );

        const { shape, fill } = ICON_DATA['conversion_arrow'];
        const conversionArrow = new Konva.Path({
            data: shape,
            fill: fill,
            scale: { x: 3, y: 3 },
            x: this.contentGroup.width() / 2 - 25,
            y: this.contentGroup.height() / 2 - 5,
        });


        this.contentGroup.add(...[
            this.goodsAssortment.getElement(),
            conversionArrow,
        ]);
    }

    public update(state: PlayState) {
        this.market = state.market;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market)
            throw new Error("Cannot render modal! Update data is missing.");

        // this.coinDial.update(this.market[slot].reward.coins);
        this.goodsAssortment.update(this.market[slot].request);
        this.open({ action: Action.donate_goods, payload: { slot } });
    }
}