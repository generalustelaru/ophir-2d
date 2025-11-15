import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { DynamicModalInterface } from '~/client/client_types';
import { Action, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState, SpecialistName, Unique } from '~/shared_types';
import { CoinDial } from '../popular';

export class ChancellorModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, MarketSlotKey>> {
    private description: Konva.Text;
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private playerFavor: number = 0;
    private coinDial: CoinDial;
    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Accept',
                dismissLabel: 'Cancel',
            },
        );

        this.description = new Konva.Text({
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width(),
            align: 'center',
            y: 10,
            fontFamily: 'Custom',
        });

        this.coinDial = new CoinDial(
            {
                x: 215,
                y: 83,
            },
            0,
        );

        this.contentGroup.add(this.description, this.coinDial.getElement());
    }

    public update(state: PlayState) {
        const chancellorPlayer = state.players.find(p => {
            return p.specialist.name == SpecialistName.chancellor;
        });
        chancellorPlayer && (this.playerFavor = chancellorPlayer.favor);
        this.market = state.market;
        this.fluctuations = state.setup.marketFluctuations;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            throw new Error('Cannot render modal! Update data is missing.');
        this.description.text((()=> {
            const goods = this.playerFavor > 1 ? 'goods' : 'good';
            return this.playerFavor
                ? `You may substitute up to ${this.playerFavor} ${goods} with favor.`
                : 'You have no favor to spare.';
        })());
        const trade = this.market[slot];
        this.coinDial.update(trade.reward.coins + this.fluctuations[slot]);
        this.open({
            action: Action.sell_as_chancellor,
            payload: { slot, omit: [] },
        });
    }
}// { slot: MarketSlotKey, omit: Array<TradeGood> }