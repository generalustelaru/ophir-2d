import Konva from 'konva';
import { ModalBase } from './ModalBase';
import constants from '~/client_constants';
import { Aspect, StaticModalInterface } from '~/client/client_types';
import { Unique } from '~/shared_types';

const { ICON_DATA, HUES } = constants;

export class ForceTurnModal extends ModalBase implements Unique<StaticModalInterface<undefined>> {
    constructor(stage: Konva.Stage, aspect: Aspect) {
        super(
            stage,
            { hasSubmit: false, dismissLabel: 'Close' },
            aspect,
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
            fill: HUES.disabled,
            scale: { x: 1.5, y: 1.5 },
            x: this.contentGroup.width() / 2 - 24,
            y: 50,
        });

        this.contentGroup.add(text, disabledAnchor);
    }

    public repositionModal(aspect: Aspect): void {
        this.reposition(aspect);
    }

    public show() {
        this.open();
    }
}
