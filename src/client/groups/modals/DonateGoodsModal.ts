import Konva from 'konva';
import { MarketOffer, PlayState, MarketSlotKey, Action } from '~/shared_types';
import { DynamicModalInterface, Unique } from '~/client/client_types';
import { FavorDial, VictoryPointDial } from '../popular';
import { GoodsAssortment } from '../location';
import { ModalBase } from './ModalBase';
import clientConstants from '~/client_constants';
import localState from '~/client/state';

const { COLOR } = clientConstants;

export class DonateGoodsModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, MarketSlotKey>> {
    private market: MarketOffer | null = null;
    private goodsAssortment: GoodsAssortment;
    private victoryPointDial: VictoryPointDial;
    private favorDial: FavorDial;
    private playerFavor: number = 0;

    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Donate',
                dismissLabel: 'Cancel',
            },
            { width: 340, height: 180 },
        );

        const description = new Konva.Text({
            text: 'Donate these goods for favor and VP?',
            fill: COLOR.boneWhite,
            fontSize: 18,
            width: this.contentGroup.width(),
            align: 'center',
            y: 10,
            fontFamily: 'Custom',
        });

        this.goodsAssortment = new GoodsAssortment(
            { x: 40, y: 35 },
            'modal',
            null,
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

        this.favorDial = new FavorDial(
            { x: this.contentGroup.width() - 126, y: this.contentGroup.height() / 2 - 5 },
            0,
        );

        this.victoryPointDial = new VictoryPointDial(
            { x: this.contentGroup.width() - 96, y: this.contentGroup.height() / 2 - 15 },
            0,
        );

        this.contentGroup.add(...[
            description,
            this.goodsAssortment.getElement(),
            colon,
            this.victoryPointDial.getElement(),
            this.favorDial.getElement(),
        ]);
    }

    public update(state: PlayState) {
        this.market = state.market;
        const player = state.players.find(p => p.color == localState.playerColor);

        if (player)
            this.playerFavor = player.favor;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market)
            throw new Error('Cannot render modal! Update data is missing.');

        const trade = this.market[slot];
        const favorReward = trade.reward.favorAndVp;
        const missingFavor = 6 - this.playerFavor;

        this.favorDial.update(Math.min(favorReward, missingFavor));
        this.goodsAssortment.update(trade.request);
        this.victoryPointDial.update(trade.reward.favorAndVp);

        this.open({ action: Action.donate_goods, payload: { slot } });
    }
}