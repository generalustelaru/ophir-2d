import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData, ElementList } from '~/client_types';
import { PlayerColor, PlayerEntry, Unique } from '~/shared_types';
import  clientConstants from '~/client_constants';
import { ColorCard } from './ColorCard';

type EnrolmentPanelUpdate = {
    players: Array<PlayerEntry>,
    localPlayerColor: PlayerColor | null,
}

const { HUES } = clientConstants;

export class EnrolmentPanel implements Unique<DynamicGroupInterface<EnrolmentPanelUpdate>> {
    private group: Konva.Group | null;
    private cards: Array<ColorCard> = [];

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
        const elements: ElementList = [];
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
        elements.push(background);

        const playerColors: Array<PlayerColor> = ['Purple' , 'Yellow' , 'Red' , 'Green'];
        const margin = 60;
        const offset = 200;
        let drift = margin;

        playerColors.forEach(color => {
            const optionCard = new ColorCard(stage, { x:drift, y:50 }, color);

            this.cards.push(optionCard);
            elements.push(optionCard.getElement());
            drift += margin + offset;
        });

        this.group.add(...elements);
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