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

const { PLAYER_HUES } = clientConstants;

export class EnrolmentPanel implements Unique<DynamicGroupInterface<EnrolmentPanelUpdate>> {
    private group: Konva.Group | null;
    private cards: Array<ColorCard> = [];
    private colorTableau: RowDistributor | null;

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

        const playerColors: Array<PlayerColor> = ['Purple' , 'Yellow' , 'Red' , 'Green'];

        playerColors.forEach(color => {
            this.cards.push(new ColorCard(
                stage,
                { x: 0, y: 0 },
                color, PLAYER_HUES[color]),
            );
        });

        this.colorTableau = new RowDistributor(
            { ...layout, x: 0, y: 0 },
            this.cards.map(c => {
                return { id: '', node: c.getElement() };
            }),
        );

        this.group.add( this.colorTableau.getElement());
    }

    public getElement() {
        if (!this.group)
            throw new Error('Cannot provide element. EnrolmentPanel was destroyed improperly.');

        return this.group;
    }

    public rearrangeRows(layout: GroupLayoutData) {
        const { width, height, x ,y } = layout;
        this.group?.width(width).height(height).x(x).y(y);
        this.colorTableau?.rearrangeNodes({ width, height, x: 0, y: 0 });
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

        this.colorTableau = null;
        this.cards = this.cards.filter(card => {
            card.selfDecomission();
            return false;
        });

        return null;
    }
}