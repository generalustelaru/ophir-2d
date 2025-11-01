import Konva from 'konva';
import { Action, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState } from '~/shared_types';
import { DynamicModalInterface } from '~/client_types';
import { CoinDial } from '../popular';
import { GoodsAssortment } from '../location';
import { ModalBase } from './ModalBase';
import clientConstants from '~/client_constants';

const { ICON_DATA } = clientConstants;

export class SellGoodsModal extends ModalBase implements DynamicModalInterface<PlayState, MarketSlotKey>{
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private coinDial: CoinDial;
    private goodsAssortment: GoodsAssortment;

    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Sell',
                dismissLabel: 'Cancel',
            },
        );

        this.goodsAssortment = new GoodsAssortment(
            { x: 60, y: 15 },
            'modal',
            null,
        );

        const { shape, fill } = ICON_DATA['conversion_arrow'];
        const conversionArrow = new Konva.Path({
            data: shape,
            fill: fill,
            scale: { x: 3, y:3 },
            x: this.contentGroup.width() / 2 - 25,
            y: this.contentGroup.height() / 2 - 5,
        });

        this.coinDial = new CoinDial(
            {
                x: this.contentGroup.width() - 90,
                y: this.contentGroup.height() / 2,
            },
            0,
        );

        this.contentGroup.add(...[
            this.goodsAssortment.getElement(),
            conversionArrow,
            this.coinDial.getElement(),
        ]);
    }

    public update(state: PlayState) {
        this.market = state.market;
        this.fluctuations = state.setup.marketFluctuations;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            throw new Error('Cannot render modal! Update data is missing.');

        this.coinDial.update(this.market[slot].reward.coins  + this.fluctuations[slot]);
        this.goodsAssortment.update(this.market[slot].request);
        this.open({ action: Action.sell_goods, payload: { slot } });
    }
}