import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { MarketSlotKey, PlayState, Trade, Unique } from '~/shared_types';
import { DynamicModalInterface, MarketCardUpdate } from '~/client/client_types';

export class PeddlerModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, undefined>> {

    private slot: MarketSlotKey | null = null;
    private trade: Trade | null = null;
    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: false,
                dismissLabel: 'Close',
            },
        );
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
        if (!this.slot)
            throw new Error('Cannot update! Peddler modal is not properly initialized.');

        this.trade = state.market[this.slot];
    }

    public show(): void {
        this.open();
        console.log({trade: this.trade});
    }
}