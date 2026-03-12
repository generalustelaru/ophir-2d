import { Aspect, DynamicModalInterface } from '~/client_types';
import { FailedInfluenceRollTransmission, Player, Unique } from '~/shared_types';
import { ModalBase } from './ModalBase';
import Konva from 'konva';
import { InfluenceDial } from '../popular';
import clientConstants from '~/client/client_constants';

const { PLAYER_HUES, HUES } = clientConstants;

export class SailFailureModal
    extends ModalBase
    implements Unique<DynamicModalInterface<undefined, FailedInfluenceRollTransmission>>
{
    private ownerDie: InfluenceDial;
    private toSailDial: InfluenceDial;

    constructor(stage: Konva.Stage, aspect: Aspect, localPlayer: Player) {
        super(
            stage,
            {
                hasSubmit: false,
                dismissLabel: 'Close',
            },
            aspect,
        );

        const failText = new Konva.Text({
            text: 'Influence roll has failed.',
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width(),
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'top',
            y: 10,
            fontFamily: 'Custom',
        });

        const offset = { x: 76, y: 34 };
        this.ownerDie = new InfluenceDial(offset, PLAYER_HUES[localPlayer.color].vivid.light);
        const lower = new Konva.Text({
            text: '<',
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
            failText,
            this.ownerDie.getElement(),
            lower,
            this.toSailDial.getElement(),
        );
    }
    public update(): void {}

    public repositionModal(aspect: Aspect): void {
        this.reposition(aspect);
    }

    public show(data: FailedInfluenceRollTransmission): void {
        this.ownerDie.update({ value: data.rolled, color: null });
        this.toSailDial.update({ value: data.toHit, color: null });
        this.open();
    }
}
