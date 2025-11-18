import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { DynamicModalInterface } from '~/client/client_types';
import {
    Action, FeasibleTrade, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState, SpecialistName, Unique,
} from '~/shared_types';
import { CoinDial, ItemRow } from '../popular';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;

export class ChancellorModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, MarketSlotKey>> {
    private description: Konva.Text;
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    // private playerFavor: number = 0;
    private playerFeasibles: Array<FeasibleTrade> = [];
    // private playerGoods: Array<TradeGood> = [];
    private itemRow: ItemRow;
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
            { width: 340, height: 180 },
        );

        this.description = new Konva.Text({
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width(),
            align: 'center',
            y: 10,
            fontFamily: 'Custom',
        });

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

        this.itemRow = new ItemRow( // TODO: have favor icons join the row for better visualization
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

        this.coinDial = new CoinDial(
            {
                x: 215,
                y: 83,
            },
            0,
        );

        this.contentGroup.add(...[
            this.description,
            colon,
            this.itemRow.getElement(),
            this.coinDial.getElement(),
        ]);
    }

    public update(state: PlayState) {
        const chancellorPlayer = state.players.find(p => {
            return p.specialist.name == SpecialistName.chancellor;
        });

        if (!chancellorPlayer)
            return;

        this.market = state.market;
        this.fluctuations = state.setup.marketFluctuations;
        this.playerFeasibles = chancellorPlayer.feasibleTrades;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            throw new Error('Cannot render modal! Update data is missing.');

        const feasible = this.playerFeasibles.find(f => f.slot == slot);

        if (!feasible)
            throw new Error('Cannot render modal! Current trade not feasible');

        this.description.text((() => {
            const types = [...new Set(feasible.missing)];
            const typeCount = types.length;
            const enumeration = (() => {
                switch (typeCount) {
                    case 0: return '';
                    case 1: return types[0];
                    case 2: return `${types[0]} and ${types[1]}`;
                    case 3: return `${types[0]}, ${types[1]}, and ${types[2]}`;
                    default: throw new Error('Cannot render moda! Missing goods exceeds requirement potential');
                }
            })();
            return typeCount
                ? `You will need to substitute ${enumeration} with ${feasible.missing.length} favor.`
                : 'You have all the goods needed for this trade';
        })());

        const trade = this.market[slot];
        this.itemRow.update(trade.request);
        this.coinDial.update(trade.reward.coins + this.fluctuations[slot]);

        this.open({
            action: Action.sell_as_chancellor,
            payload: { slot, omit: feasible.missing },
        });
    }
}