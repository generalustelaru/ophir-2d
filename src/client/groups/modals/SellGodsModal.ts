import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { Action, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState } from "~/shared_types";
import { CoinDial } from "../GroupList";
import { ModalInterface } from "~/client_types";
// import clientConstants from "~/client_constants";

// const { CARGO_ITEM_DATA } = clientConstants;

export class SellGoodsModal extends ModalBase implements ModalInterface<PlayState, MarketSlotKey>{
    // private playerCargo: Array<ItemName> = [];
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private coinDial: CoinDial;
    // private cargoItemLayout: Array<Coordinates>;

    constructor(stage: Konva.Stage) {
        super(stage, { hasSubmit: true, actionMessage: null });

        this.coinDial = new CoinDial(
            {
                x: this.contentGroup.width() / 2,
                y: this.contentGroup.height() / 2,
            },
            0,
        );

        // const driftX = this.contentGroup.x();
        // const driftY = this.contentGroup.y();

        // this.cargoItemLayout = [
        //     { x: 0, y: 0 },
        //     { x: 20, y: 0 },
        //     { x: 40, y: 0 },
        //     { x: 60, y: 0 },
        // ].map(c => {
        //     return {
        //         x: driftX + c.x,
        //         y: driftY + c.y,
        //     }
        // });

        this.contentGroup.add(this.coinDial.getElement())
    }

    public update(state: PlayState) {
        this.market = state.market
        this.fluctuations = state.setup.marketFluctuations;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            throw new Error("Cannot render modal! Update data is missing.");

        this.coinDial.update(this.market[slot].reward.coins  + this.fluctuations[slot]);
        this.open({ action: Action.sell_goods, payload: { slot } });
    }
}