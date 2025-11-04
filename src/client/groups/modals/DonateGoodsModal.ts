import Konva from 'konva';
import { MarketOffer, PlayState, MarketSlotKey, Action } from '~/shared_types';
import { DynamicModalInterface } from '~/client/client_types';
import { FavorDial, VictoryPointDial } from '../popular';
import { GoodsAssortment } from '../location';
import { ModalBase } from './ModalBase';
import clientConstants from '~/client_constants';
import localState from '~/client/state';

const { ICON_DATA, COLOR } = clientConstants;

export class DonateGoodsModal extends ModalBase implements DynamicModalInterface<PlayState, MarketSlotKey> {
    private market: MarketOffer | null = null;
    // private confirmationText: Konva.Text;
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
                submitLabel: 'Yes',
                dismissLabel: 'Cancel',
            },
            { width: 340, height: 180 },
        );

        const confirmationText = new Konva.Text({
            text: 'Donate these goods for favor and VP?',
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width(),
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'top',
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
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'middle',
            y: 20,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
            fill: COLOR.boneWhite,
        });

        this.favorDial = new FavorDial(
            { x: this.contentGroup.width() - 126, y: this.contentGroup.height() / 2 - 3 },
            0,
        );

        this.victoryPointDial = new VictoryPointDial(
            { x: this.contentGroup.width() - 96, y: this.contentGroup.height() / 2 - 13 },
            0,
        );

        this.contentGroup.add(...[
            confirmationText,
            this.goodsAssortment.getElement(),
            colon,
            this.victoryPointDial.getElement(),
            this.favorDial.getElement(),
        ]);

        // this.addToLayer(confirmationText);
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