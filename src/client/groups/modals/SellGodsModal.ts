import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { Action, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState } from "~/shared_types";
import { MarketCard } from "../GroupList";
import {GroupLayoutData, ModalInterface } from "~/client/client_types";

export class SellGoodsModal extends ModalBase implements ModalInterface<PlayState, MarketSlotKey>{
    private marketCardLayout: GroupLayoutData;
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private marketCard: MarketCard | null = null;

    constructor(stage: Konva.Stage) {
        super(stage);
        this.marketCardLayout = {
            width: 66,
            height: 108,
            x: this.background.x(),
            y: this.background.y(),
        }
    }

    public update(state: PlayState) {
        this.market = state.market
        this.fluctuations = state.setup.marketFluctuations;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            throw new Error("Cannot render modal! Update data is missing.");

        this.marketCard && this.marketCard.getElement().destroy();
        this.marketCard = new MarketCard(
            this.stage,
            this.marketCardLayout,
            null,
            this.market[slot],
            this.fluctuations[slot],
        )
        this.group.add(this.marketCard.getElement());
        this.open({ action: Action.sell_goods, payload: { slot } });
    }
}