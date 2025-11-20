import Konva from 'konva';
import { MarketOffer, PlayState, MarketSlotKey, Action, Unique } from '~/shared_types';
import { DynamicModalInterface } from '~/client/client_types';
import { FavorDial, ItemRow, VictoryPointDial } from '../popular';
import { ModalBase } from './ModalBase';
import clientConstants from '~/client_constants';
import localState from '~/client/state';

const { COLOR } = clientConstants;

export class DonateGoodsModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, MarketSlotKey>> {
    private market: MarketOffer | null = null;
    private itemRow: ItemRow;
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

        const description = new Konva.Text({
            text: 'Donate these goods for favor and VP?',
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
            { alignRight: true },
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

        const rewardX = 195;
        const rewardY = 45;
        this.favorDial = new FavorDial(
            { x: rewardX, y: rewardY + 10 },
            0,
        );

        this.victoryPointDial = new VictoryPointDial(
            { x: rewardX + 30, y: rewardY },
            0,
        );

        this.contentGroup.add(...[
            description,
            this.itemRow.getElement(),
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
        this.itemRow.update(trade.request);
        this.victoryPointDial.update(trade.reward.favorAndVp);

        this.open({ action: Action.donate_goods, payload: { slot } });
    }
}