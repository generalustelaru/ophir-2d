import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { ShipToken, SymbolicInfluenceDial } from '../popular';
import clientConstants from '~/client/client_constants';
import { Aspect, StaticModalInterface } from '~/client/client_types';
import { Unique } from '~/shared_types';

const { HUES } = clientConstants;

export class RivalControlModal extends ModalBase implements Unique<StaticModalInterface<undefined>> {
    private shipToken : ShipToken;

    constructor(stage: Konva.Stage, aspect: Aspect) {
        super(
            stage,
            { hasSubmit: false, dismissLabel: 'Close' },
            aspect,
            { width: 310, height: 200 },
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

        this.shipToken = new ShipToken({
            combo: { light: HUES.Neutral, dark: HUES.darkNeutral, accent: HUES.shipBorder },
            position: { x: 90, y: 95 },
        });

        const ampersand = new Konva.Text({
            text: '&',
            width: this.contentGroup.width(),
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'middle',
            y: 30,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
            fill: HUES.boneWhite,
        });

        const rivalDie = new SymbolicInfluenceDial({
            hue: HUES.Neutral,
            symbol: '?',
            position: { x: 190, y: 74 },
        });

        this.contentGroup.add(...[
            text,
            this.shipToken.getElement(),
            ampersand,
            rivalDie.getElement(),
        ]);
    }

    public repositionModal(aspect: Aspect): void {
        this.reposition(aspect);
    }

    public show() {
        this.open();
    }
}
