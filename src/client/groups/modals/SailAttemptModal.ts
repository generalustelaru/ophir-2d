import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { Action } from '~/shared_types';
import { InfluenceDial } from '../InfluenceDial';
import clientConstants from '~/client/client_constants';
import { DynamicModalInterface, SailAttemptArgs } from '~/client/client_types';

const { COLOR } = clientConstants;

export class SailAttemptModal extends ModalBase implements DynamicModalInterface<undefined, SailAttemptArgs> {
    private ownerDieFace: Konva.Rect;
    private toSailDial: InfluenceDial;
    private dieSymbol: Konva.Text;
    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Roll',
                cancelLabel: 'Cancel',
            },
        );

        const iconRow = new Konva.Group({
            width: 150,
            height: 50,
            x: 76,
            y: 24,
        });
        this.ownerDieFace = new Konva.Rect({
            width: 50,
            height: 50,
            cornerRadius: 10,
        });
        this.dieSymbol = new Konva.Text({
            text: '?',
            width: this.ownerDieFace.width(),
            height: this.ownerDieFace.height(),
            align: 'center',
            verticalAlign: 'middle',
            y: 5,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
        });
        const greaterEqual = new Konva.Text({
            text: '≥',
            width: iconRow.width(),
            height: iconRow.height(),
            align: 'center',
            verticalAlign: 'middle',
            y: 5,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
            fill: COLOR.boneWhite,
        });
        this.toSailDial = new InfluenceDial(
            {
                x: 100,
                y: 0,
            },
            COLOR.boneWhite,
        );
        iconRow.add(...[
            this.ownerDieFace,
            this.dieSymbol,
            greaterEqual,
            this.toSailDial.getElement(),
        ]);

        this.contentGroup.add(...[
            iconRow,
        ]);
    }

    public update() {}

    public show(data: SailAttemptArgs) {
        const symbol = (()=> {
            switch (true) {
                case data.toSail <= (data.isTempleGuard ? 2 : 1) : return '✓';
                case data.moveActions === 1: return (data.toSail > 4 ? '!!' : '!');
                default: return '?';
            }
        })();
        this.dieSymbol.text(symbol) ;
        this.ownerDieFace.fill(COLOR[data.playerColor]);
        this.toSailDial.update({ value: data.toSail, color: null });

        this.open({ action: Action.move, payload: data.destination });
    }
}
