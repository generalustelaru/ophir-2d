import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { ShipToken } from '../popular';

export class RivalControlModal extends ModalBase {
    private shipToken : ShipToken;

    constructor(stage: Konva.Stage) {
        super(
            stage,
            { hasSubmit: false, cancelLabel: 'Close' },
            { width: 310, height: 200 },
        );

        this.shipToken = new ShipToken(
            'Neutral',
            {
                position: { x: 100, y: 100 },
            },
        );

        const text = new Konva.Text({
            text: 'You\'ll have to handle the rival\nship before continuing.',
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width() - 5,
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'top',
            y: 10,
            fontFamily: 'Custom',
        });

        this.contentGroup.add(text, this.shipToken.getElement());
    }

    public show() {
        this.open();
    }
}
