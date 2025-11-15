import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { DynamicModalInterface } from '~/client/client_types';
import { MarketSlotKey, Unique } from '~/shared_types';

export class ChancellorModal extends ModalBase implements Unique<DynamicModalInterface<undefined, MarketSlotKey>> {
    private text: Konva.Text;
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

        this.text = new Konva.Text({ fill: 'white', fontSize: 24 });

        this.contentGroup.add(this.text);
    }

    public update() {}

    public show(slot: MarketSlotKey) {
        this.text.text(`You are looking at ${slot}`);
        this.open();
    }
}