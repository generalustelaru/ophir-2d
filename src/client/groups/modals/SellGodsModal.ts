import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { Action, MarketSlotKey } from "~/shared_types";

export class SellGoodsModal extends ModalBase {

    constructor(stage: Konva.Stage) {
        super(stage);
    }

    public show(slot: MarketSlotKey) {
        this.open({ action: Action.sell_goods, payload: { slot } });
    }
}