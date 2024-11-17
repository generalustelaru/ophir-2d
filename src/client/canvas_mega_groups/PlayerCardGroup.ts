import Konva from 'konva';
import { MegaGroupInterface, GroupLayoutData } from '../client_types';
import { PlayerCard } from '../canvas_groups/CanvasGroups';
import clientState from '../state';

export class PlayerCardGroup implements MegaGroupInterface {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private playerCards: Array<PlayerCard> = [];

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[0].add(this.group);

        this.stage = stage;
    }

    // MARK: DRAW
    public drawElements(): void {
        const verticalOffsets = [20, 140, 260, 380];

        clientState.received.players.forEach(player => {
            const playerCard = new PlayerCard(
                this.stage,
                player,
                clientState.localPlayerId,
                verticalOffsets.shift() as number
            );
            this.group.add(playerCard.getElement());
            this.playerCards.push(playerCard);
        });
    }

    // MARK: UPDATE
    public updateElements(): void {

        this.playerCards.forEach(playerCard => {
            const player = clientState.received.players.find(player => player.id === playerCard.getId());
            if (player) {
                playerCard.updateElement(player);
            } else {
                playerCard.getElement().destroy();
            }
        });
    }
}