import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { PlayerColor, PlayerDraft, SelectableSpecialist, SpecialistName, Unique } from '~/shared_types';
import  clientConstants from '~/client_constants';
import { RowDistributor } from '../popular';
import { SpecialistCard } from './SpecialistCard';
import localState from '../../state';

type SetupPanelUpdate = {
    players: Array<PlayerDraft>,
    specialists: Array<SelectableSpecialist>,
}

const { HUES } = clientConstants;

export class SetupPanel implements Unique<DynamicGroupInterface<SetupPanelUpdate>> {
    private group: Konva.Group | null;
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
            fill: HUES.modalBlue,
        });
        this.group.add(background);

        specialists.forEach( specialist => {
            const card = new SpecialistCard(
                stage,
                specialist,
                { x: 0, y: 0 },
                (name = specialist.name) => {this.preSelect(name);},
            );

            this.specialistCards.push(card);
        });

        const cardRow = new RowDistributor(
            { ...layout, x: 0, y: 0 },
            this.specialistCards.map(s => {
                return { id: s.getCardName(), node: s.getElement() };
            }),
        );

        this.group.add(cardRow.getElement());
    }

    public getElement() {
        if (!this.group)
            throw new Error('Cannot provide element. SetupPanel was destroyed improperly.');

        return this.group;
    }

    public update(update: SetupPanelUpdate) {
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
        this.group?.visible() ? this.group.hide() : this.group?.show();
    }

    private preSelect(name: SpecialistName) {
        for (const card of this.specialistCards) {
            card.preSelect(card.getCardName() == name);
        }
    }

    public selfDecomission(): null {
        this.group?.destroy();
        this.group = null;

        this.specialistCards = this.specialistCards.filter( card => {
            card.selfDecomission();
            return false;
        });

        return null;
    }
}
