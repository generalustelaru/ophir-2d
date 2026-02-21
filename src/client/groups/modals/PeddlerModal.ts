import Konva from 'konva';
import {
    Action, ClientMessage, FeasibleTrade, MarketFluctuations, MarketSlotKey, PlayState, SpecialistName, Trade, TradeGood,
    Unique,
} from '~/shared_types';
import { Aspect, DynamicModalInterface, Specification } from '~/client_types';
import { CoinDial } from '../popular';
import { ModalBase, SymbolRow, lib } from '.';
import clientConstants from '~/client_constants';

const { HUES } = clientConstants;

export class PeddlerModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, undefined>> {

    private description: Konva.Text;
    private slot: MarketSlotKey;
    private feasability: FeasibleTrade | null = null;
    private trade: Trade | null = null;
    private symbolRow: SymbolRow;
    private tradeSpecifications: Array<Specification> = [];
    private coinDial: CoinDial;
    private selectedIndex: number = -1;

    constructor(
        stage: Konva.Stage,
        marketFluctuations: MarketFluctuations,
        aspect: Aspect,
    ) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Accept',
                dismissLabel: 'Close',
            },
            aspect,
            { width: 340, height: 180 },
        );

        this.slot = ((): MarketSlotKey => {
            const { slot_1, slot_2 } = marketFluctuations;
            switch(-1) {
                case slot_1: return 'slot_1';
                case slot_2: return 'slot_2';
                default: return 'slot_3';
            }
        })();

        this.description = new Konva.Text({
            fill: HUES.boneWhite,
            fontSize: 18,
            width: this.contentGroup.width(),
            align: 'center',
            y: 10,
            fontFamily: 'Custom',
        });

        this.symbolRow = new SymbolRow(
            stage,
            { x: 30, y: 65 },
            (index: number) => this.switchToken(index),
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
            this.coinDial.getElement(),
            this.symbolRow.getElement(),
        ]);
    }

    public update(state: PlayState): void {
        const peddlerPlayer = state.players.find(
            p => p.specialist.name == SpecialistName.peddler,
        );

        if (!peddlerPlayer)
            return;

        if (!this.slot)
            throw new Error('Cannot update! Peddler modal is not properly initialized.');

        this.trade = state.market[this.slot];
        this.feasability = peddlerPlayer.feasibleTrades.find(
            t => t.slot == this.slot,
        ) || null;
    }

    public repositionModal(aspect: Aspect): void {
        this.reposition(aspect);
    }

    public show(): void {
        if (!this.trade)
            return lib.throwRenderError('Trade is missing.');

        this.tradeSpecifications = this.trade.request.map(requested => {
            return { name: requested, isOmited: false, isLocked: false };
        });

        if (!this.feasability)
            return lib.throwRenderError('Trade feasibility is missing.');

        const feasibleSymbols = lib.getFeasibleSymbols(
            this.trade.request,
            this.feasability.missing,
        );

        const isGoodMissing = feasibleSymbols.includes('other');
        const missingGood = isGoodMissing ? this.feasability.missing[0] : null;

        this.description.text(isGoodMissing
            ? `You may complete this trade without delivering ${missingGood}.`
            : 'You may choose to withhold one commodity from this delivery.',
        );

        feasibleSymbols.forEach((symbol, index) => {
            this.tradeSpecifications[index].isLocked = isGoodMissing;
            if (symbol == 'other')
                this.tradeSpecifications[index].isOmited = true;
        });

        const actionMessage = this.composeMessage(missingGood || false);

        this.symbolRow.update({ specifications: this.tradeSpecifications });
        this.coinDial.update(this.trade.reward.coins - 1);
        this.open(actionMessage);
    }

    private switchToken(index: number) {
        for (const spec of this.tradeSpecifications) {
            spec.isOmited = false;
        }

        const hasDeselected = index == this.selectedIndex;

        if (hasDeselected) {
            if (!this.slot)
                throw new Error('Cannot set standard trade! Slot is missing.');

            this.updateActionMessage(this.composeMessage(false));
        } else {
            this.selectedIndex = index;
            const selected = this.tradeSpecifications[index];
            selected.isOmited = true;

            this.updateActionMessage(this.composeMessage(selected.name));
        }

        this.symbolRow.update({ specifications: this.tradeSpecifications });
    }

    private composeMessage(toOmit: TradeGood | false): ClientMessage {
        return toOmit
            ? {
                action: Action.sell_as_peddler,
                payload: { omit: toOmit },
            }
            : {
                action: Action.sell_goods,
                payload: { slot: this.slot },
            };
    }
}