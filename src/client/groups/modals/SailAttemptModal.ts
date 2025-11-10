import Konva from 'konva';
import { Action, Unique } from '~/shared_types';
import { DynamicModalInterface, SailAttemptArgs } from '~/client/client_types';
import { InfluenceDial, SymbolicInfluenceDial } from '../popular';
import { ModalBase } from './ModalBase';
import clientConstants from '~/client/client_constants';

const { COLOR } = clientConstants;

export class SailAttemptModal extends ModalBase implements Unique<DynamicModalInterface<undefined, SailAttemptArgs>> {
    private ownerDie: SymbolicInfluenceDial;
    private toSailDial: InfluenceDial;
    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Roll',
                dismissLabel: 'Cancel',
            },
        );

        const iconRow = new Konva.Group({
            width: 150,
            height: 50,
            x: 76,
            y: 24,
        });

        this.ownerDie = new SymbolicInfluenceDial();

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
            this.ownerDie.getElement(),
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
                case data.moveActions === 1 : return '!!';
                default: return '?';
            }
        })();
        this.ownerDie.update({ symbol, color: data.playerColor });
        this.toSailDial.update({ value: data.toSail, color: null });

        this.open({ action: Action.move, payload: data.destination });
    }
}
