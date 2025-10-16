import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { PlayerColor, PlayerDraft, SelectableSpecialist } from '~/shared_types';
import  clientConstants from '~/client_constants';
import { SpecialistCard } from './SpecialistCard';
import localState from '../../state';

type SetupModalUpdate = {
    players: Array<PlayerDraft>,
    specialists: Array<SelectableSpecialist>,
}

const { COLOR } = clientConstants;

export class SetupModal implements DynamicGroupInterface<SetupModalUpdate> {
    private group: Konva.Group;
    private specialistCards:  Array<SpecialistCard> = [];
    private localPlayerColor: PlayerColor | null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData, specialists: Array<SelectableSpecialist>) {
        this.localPlayerColor = localState.playerColor;
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            cornerRadius: 15,
            fill: COLOR.modalRed,
        });
        this.group.add(background);

        let offset = 20;
        specialists.forEach( specialist => {
            const card = new SpecialistCard(
                stage,
                specialist,
                offset,
            );
            this.group.add(card.getElement());

            this.specialistCards.push(card);
            offset += 220;
        });
    }

    public getElement() {
        return this.group;
    }

    public update(update: SetupModalUpdate) {
        this.specialistCards.forEach(card => {
            const specialist = update.specialists.find(s => s.name === card.getCardName());

            if (!specialist)
                throw new Error(`Specialist [${card.getCardName()}] is missing from state`);

            const pickyPlayer = update.players.find(p => p.turnToPick);
            card.update({
                specialist,
                shouldEnable: this.localPlayerColor === pickyPlayer?.color && !specialist.owner,
                localPlayerColor: this.localPlayerColor,
            });
        });
    }

    public switchVisibility() {
        this.group.visible() ? this.group.hide() : this.group.show();
    }
}
