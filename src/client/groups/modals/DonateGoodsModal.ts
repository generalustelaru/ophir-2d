import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { MarketOffer, PlayState, MarketSlotKey, Action } from '~/shared_types';
import { FavorDial, GoodsAssortment } from '../GroupList';
import clientConstants from '~/client_constants';
import { VictoryPointDial } from '../VictoryPointDial';
import localState from '~/client/state';

const { ICON_DATA } = clientConstants;

export class DonateGoodsModal extends ModalBase {
    private market: MarketOffer | null = null;
    private goodsAssortment: GoodsAssortment;
    private victoryPointDial: VictoryPointDial;
    private favorDial: FavorDial;
    private playerFavor: number = 0;

    constructor(stage: Konva.Stage) {
        super(stage, { hasSubmit: true, actionMessage: null });

        this.goodsAssortment = new GoodsAssortment(
            { x: 40, y: 15 },
            'modal',
            null,
        );

        const { shape, fill } = ICON_DATA['conversion_arrow'];
        const conversionArrow = new Konva.Path({
            data: shape,
            fill: fill,
            scale: { x: 3, y: 3 },
            x: this.contentGroup.width() / 2 - 45,
            y: this.contentGroup.height() / 2 - 5,
        });

        this.favorDial = new FavorDial(
            { x: this.contentGroup.width() - 126, y: this.contentGroup.height() / 2 - 23 },
            0,
        );

        this.victoryPointDial = new VictoryPointDial(
            { x: this.contentGroup.width() - 96, y: this.contentGroup.height() / 2 - 33 },
            0,
        );

        this.contentGroup.add(...[
            this.goodsAssortment.getElement(),
            conversionArrow,
            this.victoryPointDial.getElement(),
            this.favorDial.getElement(),
        ]);
    }

    public update(state: PlayState) {
        this.market = state.market;
        const player = state.players.find(p => p.color == localState.playerColor);

        if (!player)
            throw new Error('Cannot find local player in state.');

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