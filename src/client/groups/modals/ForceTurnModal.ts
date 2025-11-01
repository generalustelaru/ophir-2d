import Konva from 'konva';
import { ModalBase } from './ModalBase';
import constants from '~/client_constants';

const { ICON_DATA, COLOR } = constants;

export class ForceTurnModal extends ModalBase {
    constructor(stage: Konva.Stage) {
        super(
            stage,
            { hasSubmit: false, cancelLabel: 'Close' },
            { width: 380, height: 160 },
        );

        const text = new Konva.Text({
            text: 'Your second move failed the influence check.\nThe turn has passed to the next player.',
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width(),
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'top',
            y: 10,
            fontFamily: 'Custom',
        });
        const anchorPath = ICON_DATA.anchored;
        const disabledAnchor = new Konva.Path({
            data: anchorPath.shape,
            fill: COLOR.disabled,
            scale: { x: 1.5, y: 1.5 },
            x: this.contentGroup.width() / 2 - 24,
            y: 50,
        });

        this.contentGroup.add(text, disabledAnchor);
    }

    public show() {
        this.open();
    }
}
