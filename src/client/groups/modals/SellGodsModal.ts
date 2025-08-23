import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { Action, ItemName, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState } from "~/shared_types";
import { MarketCard, CoinDial } from "../GroupList";
import {GroupLayoutData, ModalInterface } from "~/client_types";
import clientConstants from "~/client_constants";

const { CARGO_ITEM_DATA } = clientConstants;

const cargoDisplayLayout = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
]

export class SellGoodsModal extends ModalBase implements ModalInterface<PlayState, MarketSlotKey>{
    private marketCardLayout: GroupLayoutData;
    private playerCargo: Array<ItemName> = [];
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private marketCard: MarketCard | null = null;
    private coinDial: CoinDial;

    constructor(stage: Konva.Stage) {
        super(stage);
        this.marketCardLayout = {
            width: 66,
            height: 108,
            x: this.background.x(),
            y: this.background.y(),
        }

        this.coinDial = new CoinDial(
            {
                x: this.background.x() + 300,
                y: this.background.y() + 150,
            },
            0,
        );

        this.group.add(this.coinDial.getElement())
    }

    public update(state: PlayState) {
        this.market = state.market
        this.fluctuations = state.setup.marketFluctuations;
        this.playerCargo = state.players.find(p => p.isActive)?.cargo || [];
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            throw new Error("Cannot render modal! Update data is missing.");

        this.marketCard?.getElement().destroy();
        this.marketCard = new MarketCard(
            this.stage,
            this.marketCardLayout,
            null,
            this.market[slot],
            this.fluctuations[slot],
        )
        this.group.add(this.marketCard.getElement());

        const coinValue = this.market[slot].reward.coins  + this.fluctuations[slot];
        this.coinDial.update(coinValue);
        this.open({ action: Action.sell_goods, payload: { slot } });
    }
}