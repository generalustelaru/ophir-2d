import Konva from 'konva';
import { CanvasMegaGroupInterface, GroupLayoutData } from '../client_types';
import { PlayMat } from '../canvas_groups/CanvasGroups';
import clientState from '../state';

export class PlayMatGroup implements CanvasMegaGroupInterface {
    private group: Konva.Group;
    private playMats: Array<PlayMat> = [];

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
        });
        stage.getLayers()[0].add(this.group);
    }

    // MARK: DRAW
    public drawElements(): void {
        const verticalOffsets = [20, 140, 260, 380];

        clientState.received.players.forEach(player => {
            const playMat = new PlayMat(player, clientState.localPlayerId, verticalOffsets.shift() as number);
            this.group.add(playMat.getElement());
            this.playMats.push(playMat);
        });
    }

    // MARK: UPDATE
    public updateElements(): void {

        this.playMats.forEach(playMat => {
            const player = clientState.received.players.find(player => player.id === playMat.getId());
            if (player) {
                playMat.updateElement(player);
            } else {
                playMat.getElement().destroy();
            }
        });
    }
}