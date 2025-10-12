import Konva from "konva";
import { ModalBase } from "./ModalBase";
import { Action, ClientMessage, Coordinates, ItemName, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState, TradeGood } from "~/shared_types";
import { MarketCard, CoinDial } from "../GroupList";
import {GroupLayoutData, ModalInterface } from "~/client_types";
import clientConstants from "~/client_constants";

const { CARGO_ITEM_DATA } = clientConstants;


export class SellGoodsModal extends ModalBase implements ModalInterface<PlayState, MarketSlotKey>{
    private marketCardLayout: GroupLayoutData;
    private playerCargo: Array<ItemName> = [];
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private marketCard: MarketCard | null = null;
    private coinDial: CoinDial;
    private cargoItemLayout: Array<Coordinates>;

    constructor(stage: Konva.Stage) {
        super(stage, { hasSubmit: true, actionMessage: null });

        this.marketCardLayout = {
            width: 66,
            height: 108,
            x: this.contentGroup.x(),
            y: this.contentGroup.y(),
        }

        this.coinDial = new CoinDial(
            {
                x: this.contentGroup.x() + 300,
                y: this.contentGroup.y() + 150,
            },
            0,
        );

        const driftX = this.contentGroup.x();
        const driftY = this.contentGroup.y();

        this.cargoItemLayout = [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 40, y: 0 },
            { x: 60, y: 0 },
        ].map(c => {
            return {
                x: driftX + c.x,
                y: driftY + c.y,
            }
        });

        this.contentGroup.add(this.coinDial.getElement())
    }

    public update(state: PlayState) {
        this.market = state.market
        this.fluctuations = state.setup.marketFluctuations;
        this.playerCargo = state.players.find(p => p.isActive)?.cargo || [];
        console.debug('UPDATED');
        console.debug({cargo: this.playerCargo})
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            throw new Error("Cannot render modal! Update data is missing.");
        console.debug('SHOW')
        console.debug({cargo: this.playerCargo});
        // this.marketCard?.getElement().destroy();
        // this.marketCard = new MarketCard(
        //     this.stage,
        //     this.marketCardLayout,
        //     null,
        //     this.market[slot],
        //     this.fluctuations[slot],
        // );
        // cargo goods remain fixed because they're not removed during update
        // Solution would be to either include them in a group for easy removal,
        // or reimplement the logic found on the player placard, maybe replacing it as well with a parameter for behavior differentiation.
        // this.group.destroyChildren();
        const goodTypes: Array<ItemName> = ['gems', 'ebony', 'marble', 'linen'];
        const playerGoods = this.playerCargo.filter(i => goodTypes.includes(i));
        playerGoods.forEach((good, index) => {
            const data = CARGO_ITEM_DATA[good];
            const coords = this.cargoItemLayout[index];
            const icon = new Konva.Path({
                x: coords.x,
                y: coords.y,
                data: data.shape,
                fill: data.fill,
                stroke: 'white',
                strokeWidth: 1,
                scale: { x: 2, y: 2 },
            });
            this.contentGroup.add(icon);
        })
        // this.group.add(this.marketCard.getElement());
        this.coinDial.update(this.market[slot].reward.coins  + this.fluctuations[slot]);
        this.open({ action: Action.sell_goods, payload: { slot } });
    }
}