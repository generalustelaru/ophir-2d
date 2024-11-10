import Konva from 'konva';
import { CanvasGroupInterface, GroupLayoutData } from '../client_types';
import { PlayMat } from '../canvas_objects/PlayMat';
import clientState from '../state';

export class PlayMatGroup implements CanvasGroupInterface {
    private group: Konva.Group;

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
            clientState.konva.playMats.push(playMat);
        });
    }

    // MARK: UPDATE
    public updateElements(): void {

        clientState.konva.playMats.forEach(playMat => {
            const player = clientState.received.players.find(player => player.id === playMat.getId());
            if (player) {
                playMat.updateElements(player);
            } else {
                playMat.getElement().destroy();
            }
        });
    }
}