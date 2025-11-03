import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { SymbolicInfluenceDial } from '../popular';
import { Action } from '~/shared_types';
import clientConstants from '~/client/client_constants';
const { LOCATION_TOKEN_DATA } = clientConstants;

export class EndRivalTurnModal extends ModalBase {
    private confirmationText: Konva.Text;
    private rivalDie: SymbolicInfluenceDial;
    private marketIcon: Konva.Path;
    constructor(stage: Konva.Stage) {
        super(
            stage,
            {
                hasSubmit: true,
                actionMessage: null,
                submitLabel: 'Yes',
                dismissLabel: 'Cancel',
            },
            { width: 310, height: 200 },
        );

        this.confirmationText = new Konva.Text({
            fill: 'white',
            fontSize: 18,
            width: this.contentGroup.width() - 5,
            height: this.contentGroup.height(),
            align: 'center',
            verticalAlign: 'top',
            y: 10,
            fontFamily: 'Custom',
        });

        this.marketIcon = new Konva.Path({
            x: 98,
            y: 74,
            data: LOCATION_TOKEN_DATA.market.shape,
            fill: LOCATION_TOKEN_DATA.market.fill,
            stroke: 'white',
            strokeWidth: .75,
            scale: { x: 4, y: 4 },
        });
        this.contentGroup.add();

        this.rivalDie = new SymbolicInfluenceDial({
            color: 'Neutral',
            symbol: '?',
            position: { x: 0, y: 74 },
        });

        this.contentGroup.add(...[
            this.confirmationText,
            this.marketIcon,
            this.rivalDie.getElement(),
        ]);
    }

    public show(isShiftingMarket: boolean) {
        const textInsert = isShiftingMarket ? ', shift market,' : '';
        this.confirmationText.text(`Conclude rival movement${textInsert} and roll influence?`);
        this.marketIcon.visible(isShiftingMarket);
        this.rivalDie.update({ position: { x: isShiftingMarket ? 163 : 130, y: 74 } });

        this.open(isShiftingMarket
            ? { action: Action.shift_market, payload: null }
            : { action: Action.end_rival_turn, payload: null },
        );
    }
}
