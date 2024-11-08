import Konva from 'konva';
import { CanvasSegmentInterface, GroupLayoutData } from '../client_types';
import { Service } from "./Service";
import { PlayMat } from '../canvas_objects/PlayMat';
import  clientConstants from '../client_constants';
import clientState from '../state';

const { COLOR } = clientConstants;
export class PlayMatGroup extends Service implements CanvasSegmentInterface {

    private group: Konva.Group;

    constructor(layer: Konva.Layer, layout: GroupLayoutData) {
        super();
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
        });
        layer.add(this.group);
    }

    public drawElements(): void {
        const thisPlayerId = clientState.localPlayerId;

        // MARK: draw playmats
        const verticalOffsets = [20, 140, 260, 380];
        clientState.received.players.forEach(player => {
            const offset = verticalOffsets.shift() as number;
            const isLocalPlayer = player.id === thisPlayerId;

            const playMat = new PlayMat(
                player,
                isLocalPlayer,
                COLOR[player.id],
                offset
            );
            this.group.add(playMat.getElement());
            clientState.konva.playMats.push(playMat);
        });
    }

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