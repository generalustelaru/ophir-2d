import Konva from 'konva';
import { MarketOffer, PlayState, MarketSlotKey, Action, Unique } from '~/shared_types';
import { Aspect, DynamicModalInterface } from '~/client/client_types';
import { FavorDial, VictoryPointDial } from '../popular';
import { ModalBase, SymbolRow, lib } from '.';
import clientConstants from '~/client_constants';
import localState from '~/client/state';

const { HUES } = clientConstants;

export class DonateGoodsModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, MarketSlotKey>> {
    private market: MarketOffer | null = null;
    private symbolRow: SymbolRow;
    private victoryPointDial: VictoryPointDial;
    private favorDial: FavorDial;
    private playerFavor: number = 0;

    constructor(stage: Konva.Stage, aspect: Aspect) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Yes',
                dismissLabel: 'Cancel',
            },
            aspect,
            { width: 340, height: 180 },
        );

        const description = new Konva.Text({
            text: 'Donate these goods for favor and VP?',
            fill: HUES.boneWhite,
            fontSize: 18,
            width: this.contentGroup.width(),
            align: 'center',
            y: 10,
            fontFamily: 'Custom',
        });

        this.symbolRow = new SymbolRow(
            stage,
            {
                width: 50,
                height: 30,
                x: 30,
                y: 65,
            },
            null,
            false,
        );

        const colon = new Konva.Text({
            text: ':',
            width: this.contentGroup.width(),
            align: 'center',
            y: 65,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
            fill: HUES.boneWhite,
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

        this.contentGroup.add(
            description,
            this.symbolRow.getElement(),
            colon,
            this.victoryPointDial.getElement(),
            this.favorDial.getElement(),
        );
    }

    public update(state: PlayState) {
        this.market = state.market;
        const player = state.players.find(p => p.color == localState.playerColor);

        if (player)
            this.playerFavor = player.favor;
    }

    public repositionModal(aspect: Aspect): void {
        this.reposition(aspect);
    }

    public show(slot: MarketSlotKey) {
        if (!this.market)
            return lib.throwRenderError('Market data is not initialized.');

        const trade = this.market[slot];
        const favorReward = trade.reward.favorAndVp;
        const missingFavor = 6 - this.playerFavor;

        this.favorDial.update(Math.min(favorReward, missingFavor));
        const specifications = trade.request.map(requested => {
            return { name: requested, isOmited: false, isLocked: true };
        });
        this.symbolRow.update({ specifications });
        this.victoryPointDial.update(trade.reward.favorAndVp);

        this.open({ action: Action.donate_goods, payload: { slot } });
    }
}