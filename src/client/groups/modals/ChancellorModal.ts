import Konva from 'konva';
import { ModalBase, SymbolRow, lib } from '.';
import { DynamicModalInterface, Specification } from '~/client/client_types';
import {
    Action, FeasibleTrade, MarketFluctuations, MarketOffer, MarketSlotKey, PlayState, SpecialistName, Unique,
} from '~/shared_types';
import { CoinDial } from '../popular';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;

export class ChancellorModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, MarketSlotKey>> {
    private description: Konva.Text;
    private fluctuations: MarketFluctuations | null = null;
    private market: MarketOffer | null = null;
    private marketSlot: MarketSlotKey | null = null;
    private playerFavor: number = 0;
    private playerFeasibles: Array<FeasibleTrade> = [];
    private symbolRow: SymbolRow;
    private tradeSpecifications: Array<Specification> = [];
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
            fill: COLOR.boneWhite,
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

        this.symbolRow = new SymbolRow(
            stage,
            {
                width: 50,
                height: 30,
                x: 30,
                y: 65,
            },
            (index: number) => this.switchToken(index),
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
            this.symbolRow.getElement(),
            this.coinDial.getElement(),
        ]);
    }

    public update(state: PlayState) {
        const chancellorPlayer = state.players.find(
            p => p.specialist.name == SpecialistName.chancellor,
        );

        if (!chancellorPlayer)
            return;

        this.playerFavor = chancellorPlayer.favor;
        this.market = state.market;
        this.fluctuations = state.setup.marketFluctuations;
        this.playerFeasibles = chancellorPlayer.feasibleTrades;
    }

    public show(slot: MarketSlotKey) {
        if (!this.market || !this.fluctuations)
            return lib.throwRenderError(' Update data is missing.');

        const feasible = this.playerFeasibles.find(f => f.slot == slot);

        if (!feasible)
            return lib.throwRenderError('Current trade not feasible');

        this.marketSlot = slot;
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

        // set vanilla specification
        const trade = this.market[slot];
        this.tradeSpecifications = trade.request.map(requested => {
            return { name: requested, isOmited: false, isLocked: false };
        });

        const feasibleSymbols = lib.getFeasibleSymbols(
            trade.request,
            feasible.missing,
        );

        // update specification for feasability
        feasibleSymbols.forEach((symbol, index) => {
            if (symbol == 'other') {
                this.tradeSpecifications[index].isOmited = true;
                this.tradeSpecifications[index].isLocked = true;
            }
        });

        this.symbolRow.update({ specifications: this.tradeSpecifications, specialist: SpecialistName.chancellor });
        this.coinDial.update(trade.reward.coins + this.fluctuations[slot]);

        this.open({
            action: Action.sell_as_chancellor,
            payload: { slot, omit: feasible.missing },
        });
    }

    private switchToken(index: number) {
        if (!this.marketSlot)
            throw new Error('Cannot edit request. Market slot missing.');

        const tradeGoodData = this.tradeSpecifications[index];

        tradeGoodData.isOmited = !tradeGoodData.isOmited;

        const omited = (this.tradeSpecifications
            .filter(sp => sp.isOmited)
            .map(sp => { return sp.name; })
        );

        if (omited.length > this.playerFavor) {
            this.setAcceptable(false);
        } else {
            this.setAcceptable(true);
            this.updateActionMessage({
                action: Action.sell_as_chancellor,
                payload: { slot: this.marketSlot, omit: omited },
            });
        }

        this.symbolRow.update({ specifications: this.tradeSpecifications, specialist: SpecialistName.chancellor });
    }
}