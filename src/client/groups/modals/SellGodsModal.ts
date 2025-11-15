import Konva from 'konva';
import { Action, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState, Unique } from '~/shared_types';
import { DynamicModalInterface } from '~/client_types';
import { CoinDial } from '../popular';
import { ItemRow } from '../popular';
import { ModalBase } from './ModalBase';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;

export class SellGoodsModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, MarketSlotKey>> {
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private coinDial: CoinDial;
    private itemRow: ItemRow;

    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Yes',
                dismissLabel: 'Cancel',
            },
            { width: 340, height: 180 },
        );

        const description = new Konva.Text({
            text: 'Sell these goods for coins?',
            fill: COLOR.boneWhite,
            fontSize: 18,
            width: this.contentGroup.width(),
            align: 'center',
            y: 10,
            fontFamily: 'Custom',
        });

        this.itemRow = new ItemRow(
            stage,
            {
                width: 50,
                height: 30,
                x: 30,
                y: 65,
            },
            30,
            true,
        );

        const colon = new Konva.Text({
            text: ':',
            width: this.contentGroup.width(),
            align: 'center',
            y: 65,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
            fill: COLOR.boneWhite,
        });

        this.coinDial = new CoinDial(
            {
                x: 215,
                y: 83,
            },
            0,
        );

        this.contentGroup.add(...[
            description,
            this.itemRow.getElement(),
            colon,
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

        const trade = this.market[slot];
        this.coinDial.update(trade.reward.coins + this.fluctuations[slot]);
        this.itemRow.update(trade.request);
        this.open({ action: Action.sell_goods, payload: { slot } });
    }
}