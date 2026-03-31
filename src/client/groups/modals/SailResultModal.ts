import { Aspect, DynamicModalInterface } from '~/client_types';
import { DiceSix, InfluenceRollTransmission, Player, PlayerColor, Unique } from '~/shared_types';
import { ModalBase } from './ModalBase';
import Konva from 'konva';
import { InfluenceDial } from '../popular';
import clientConstants from '~/client/client_constants';

const { PLAYER_HUES, HUES, ROLL_SUSPENSE_MS } = clientConstants;

type Update = { color: PlayerColor }
export class SailResultModal
    extends ModalBase
    implements Unique<DynamicModalInterface<Update, InfluenceRollTransmission>> {
    private ownerDie: InfluenceDial;
    private toSailDial: InfluenceDial;
    private symbol: Konva.Text;
    private description: Konva.Text;

    constructor(stage: Konva.Stage, aspect: Aspect, localPlayer: Player) {
        super(
            stage,
            {
                hasSubmit: false,
                dismissLabel: 'Close',
            },
            aspect,
        );

        this.description = new Konva.Text({
            text: 'Rolling...',
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
        this.symbol = new Konva.Text({
            text: '?',
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
            this.description,
            this.ownerDie.getElement(),
            this.symbol,
            this.toSailDial.getElement(),
        );
    }
    public update(): void { }

    public repositionModal(aspect: Aspect): void {
        this.reposition(aspect);
    }

    public async show(data: InfluenceRollTransmission): Promise<void> {
        const { toHit, rolled } = data;
        this.description.text('Rolling influence...');
        this.symbol.text('?');
        this.symbol.fill(HUES.boneWhite);
        this.toSailDial.update({ value: toHit });
        this.open();
        super.disableDismiss();

        this.simulateRoll(rolled).then(() => {
            if (rolled < toHit) {
                this.description.text('The roll has failed.');
                this.symbol.text('<');
                this.symbol.fill(HUES.stopRed);
            } else {
                this.description.text('The roll has succeeded!');
                this.symbol.text(rolled > toHit ? '>' : '=');
                this.symbol.fill(HUES.goGreen);
            }

            super.enableDismiss();
        });
    }

    private async simulateRoll(result: DiceSix): Promise<void> {
        return new Promise(resolve => {
            let fauxRolled = Math.ceil(Math.random() * 6);

            const rollInterval = setInterval(() => {
                let roll = fauxRolled;

                while (roll == fauxRolled) roll = Math.ceil(Math.random() * 6);

                fauxRolled = roll;
                this.ownerDie.update({ value: roll as DiceSix } );
            }, 150);

            setTimeout(() => {
                clearInterval(rollInterval);
                this.ownerDie.update({ value: result } );
                resolve();
            }, ROLL_SUSPENSE_MS);
        });
    }
}
