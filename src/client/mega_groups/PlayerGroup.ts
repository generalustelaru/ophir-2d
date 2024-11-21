import Konva from 'konva';
import { MegaGroupInterface, GroupLayoutData } from '../client_types';
import { PlayerPlacard } from '../groups/GroupList';
import clientState from '../state';

export class PlayerGroup implements MegaGroupInterface {
    private group: Konva.Group;
    private playerPlacards: Array<PlayerPlacard> = [];

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[0].add(this.group);
    }

    // MARK: DRAW
    public drawElements(): void {
        const verticalOffsets = [20, 140, 260, 380];

        clientState.received.players.forEach(player => {
            const placard = new PlayerPlacard(
                player,
                clientState.localPlayerId,
                verticalOffsets.shift() as number
            );
            this.group.add(placard.getElement());
            this.playerPlacards.push(placard);
        });
    }

    // MARK: UPDATE
    public updateElements(): void {

        this.playerPlacards.forEach(placard => {
            const player = clientState.received.players.find(player => player.id === placard.getId());
            if (player) {
                placard.updateElement(player);
            } else {
                placard.getElement().destroy();
            }
        });
    }
}