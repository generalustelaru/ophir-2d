import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { Action, FeasibleTrade, MarketSlotKey, PlayState, SpecialistName, Trade, Unique } from '~/shared_types';
import { DynamicModalInterface, Specification } from '~/client_types';
import { CoinDial } from '../popular';
import { SymbolRow } from './SymbolRow';
import clientConstants from '~/client_constants';
import { lib } from './lib';

const { COLOR } = clientConstants;

export class PeddlerModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, undefined>> {

    private description: Konva.Text;
    private slot: MarketSlotKey | null = null;
    private feasability: FeasibleTrade | null = null;
    private trade: Trade | null = null;
    private symbolRow: SymbolRow;
    private tradeSpecifications: Array<Specification> = [];
    private coinDial: CoinDial;
    private selectedIndex: number = -1;

    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Accept',
                dismissLabel: 'Close',
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
            text: 'In development...',
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
            this.description,
            colon,
            this.coinDial.getElement(),
            this.symbolRow.getElement(),
        ]);
    }

    public initialize(state: PlayState) {
        this.slot = ((): MarketSlotKey => {
            const { slot_1, slot_2 } = state.setup.marketFluctuations;
            switch(-1) {
                case slot_1: return 'slot_1';
                case slot_2: return 'slot_2';
                default: return 'slot_3';
            }
        })();
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
        feasibleSymbols.forEach((symbol, index) => {
            this.tradeSpecifications[index].isLocked = isGoodMissing;
            if (symbol == 'other')
                this.tradeSpecifications[index].isOmited = true;
        });

        this.symbolRow.update({ specifications: this.tradeSpecifications, specialist: SpecialistName.peddler });
        this.coinDial.update(this.trade.reward.coins - 1);
        this.open();
    }

    private switchToken(index: number) {

        for (const spec of this.tradeSpecifications) {
            spec.isOmited = false;
        }

        const hasDeselected = index == this.selectedIndex;

        if (hasDeselected) {
            if (!this.slot)
                throw new Error('Cannot set standard trade! Slot is missing.');

            this.updateActionMessage({
                action: Action.sell_goods,
                payload: { slot: this.slot },
            });
        } else {
            this.selectedIndex = index;
            const selected = this.tradeSpecifications[index];
            selected.isOmited = true;

            this.updateActionMessage({
                action: Action.sell_as_peddler,
                payload: { omit: selected.name },
            });
        }

        this.symbolRow.update({
            specifications: this.tradeSpecifications,
            specialist: SpecialistName.peddler,
        });
    }
}