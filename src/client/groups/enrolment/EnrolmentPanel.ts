import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { PlayerColor, PlayerEntry, Unique } from '~/shared_types';
import  clientConstants from '~/client_constants';
import { ColorCard } from './ColorCard';
import { RowDistributor } from '../popular';

type EnrolmentPanelUpdate = {
    players: Array<PlayerEntry>,
    localPlayerColor: PlayerColor | null,
}

const { HUES, PLAYER_HUES } = clientConstants;

export class EnrolmentPanel implements Unique<DynamicGroupInterface<EnrolmentPanelUpdate>> {
    private group: Konva.Group | null;
    private cards: Array<ColorCard> = [];

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
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

        const playerColors: Array<PlayerColor> = ['Purple' , 'Yellow' , 'Red' , 'Green'];

        playerColors.forEach(color => {
            this.cards.push(new ColorCard(
                stage,
                { x: 0, y: 0 },
                color, PLAYER_HUES[color]),
            );
        });

        const cardRow = new RowDistributor(
            { ...layout, x: 0, y: 0 },
            this.cards.map(c => {
                return { id: '', node: c.getElement() };
            }),
        );

        this.group.add(background, cardRow.getElement());
    }

    public getElement() {
        if (!this.group)
            throw new Error('Cannot provide element. EnrolmentPanel was destroyed improperly.');

        return this.group;
    }

    public update(data: EnrolmentPanelUpdate) {
        const { players, localPlayerColor } = data;
        const localPlayer = players.find(p => p.color === localPlayerColor);

        this.cards.forEach(colorCard => {
            colorCard.update({ localPlayer: localPlayer || null, players });
        });
    }

    public selfDecomission(): null {
        this.group?.destroy();
        this.group = null;

        this.cards = this.cards.filter(card => {
            card.selfDecomission();
            return false;
        });

        return null;
    }
}