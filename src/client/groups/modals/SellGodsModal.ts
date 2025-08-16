import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { MarketSlotKey } from "~/shared_types";

export class SellGoodsModal extends ModalBase {
    private text: Konva.Text;
    constructor(stage: Konva.Stage) {
        super(stage);
        this.text = new Konva.Text({
            fontFamily: 'Custom',
            fontSize: 20,
            fill: 'white',
        });
        this.group.add(this.text);
    }

    show(slot: MarketSlotKey) {
        this.text.text(slot);
        this.open();
    }
}