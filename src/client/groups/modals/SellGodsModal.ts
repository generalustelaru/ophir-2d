import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { MarketSlotKey } from "~/shared_types";

export class SellGoodsModal extends ModalBase {

    constructor(
        stage: Konva.Stage,
    ) {
        super(
            stage,
            () => {}
        );
    }

    public show(slot: MarketSlotKey) {
        console.log(slot);
        this.open();
    }
}