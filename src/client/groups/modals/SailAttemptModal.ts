import Konva from 'konva';
import { Action, Unique } from '~/shared_types';
import { Aspect, DynamicModalInterface, SailAttemptArgs } from '~/client/client_types';
import { InfluenceDial, SymbolicInfluenceDial } from '../popular';
import { ModalBase } from './ModalBase';
import clientConstants from '~/client/client_constants';

const { PLAYER_HUES, HUES } = clientConstants;

export class SailAttemptModal extends ModalBase implements Unique<DynamicModalInterface<undefined, SailAttemptArgs>> {
    private ownerDie: SymbolicInfluenceDial;
    private toSailDial: InfluenceDial;
    constructor(stage: Konva.Stage, aspect: Aspect) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Roll',
                dismissLabel: 'Cancel',
            },
            aspect,
        );

        const offset = { x: 76, y: 24 };

        this.ownerDie = new SymbolicInfluenceDial( { position: offset });

        const greaterEqual = new Konva.Text({
            text: '≥',
            width: 150,
            height: 50,
            align: 'center',
            verticalAlign: 'middle',
            x: offset.x,
            y: offset.y + 5,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
            fill: HUES.boneWhite,
        });

        this.toSailDial = new InfluenceDial(
            {
                x: offset.x + 100,
                y: offset.y,
            },
            HUES.boneWhite,
        );

        this.contentGroup.add(
            this.ownerDie.getElement(),
            greaterEqual,
            this.toSailDial.getElement(),
        );
    }

    public update() {}

    public repositionModal(aspect: Aspect): void {
        this.reposition(aspect);
    }

    public show(data: SailAttemptArgs) {
        const symbol = (()=> {
            switch (true) {
                case data.toSail <= (data.isTempleGuard ? 2 : 1) : return '✓';
                case data.moveActions === 1 : return '!!';
                default: return '?';
            }
        })();
        this.ownerDie.update({ symbol, hue: PLAYER_HUES[data.playerColor].vivid.light });
        this.toSailDial.update({ value: data.toSail, color: null });

        this.open({ action: Action.move, payload: data.destination });
    }
}
