import Konva from 'konva';
import { Action, PlayState, SpecialistName } from '~/shared_types';
import { DynamicModalInterface } from '~/client/client_types';
import { FavorDial } from '../popular';
import { ModalBase } from './ModalBase';
import localState from '~/client/state';

export class EndTurnModal extends ModalBase implements DynamicModalInterface<PlayState, undefined> {
    private text: Konva.Text;
    private favorDial: FavorDial;
    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: { action: Action.end_turn, payload: null },
                submitLabel: 'End',
                cancelLabel: 'Cancel',
            },
        );

        this.text = new Konva.Text({
            text: 'End your turn?',
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width(),
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'middle',
            fontFamily: 'Custom',
        });

        this.favorDial = new FavorDial(
            {
                x:this.contentGroup.width()/2 + 46,
                y:this.contentGroup.height()/2 - 28,
            },
            1,
        );
        this.favorDial.hide();

        this.contentGroup.add(this.text, this.favorDial.getElement());
    }

    public update(state: PlayState) {
        if (Boolean(state.players.find(
            p =>
                p.specialist.name === SpecialistName.priest
                && p.bearings.location === 'temple'
                && p.color === localState.playerColor
                && p.favor < 6,
        ))) {
            const iconSpan = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
            this.text.text(`End turn and gain${iconSpan}?`);
            this.favorDial.show();
        } else {
            this.text.text('End your turn?');
            this.favorDial.hide();
        }
    }

    public show() {
        this.open();
    }
}
