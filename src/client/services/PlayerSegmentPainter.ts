import Konva from 'konva';
import { CanvasSegmentInterface, Color} from '../client_types';
import { Service } from "./Service";
import { PlayMat } from '../canvas_objects/PlayMat';
import  clientConstants from '../client_constants';
import clientState from '../state';

const { COLOR } = clientConstants;
export class PlayerSegmentPainter extends Service implements CanvasSegmentInterface {

    private layer: Konva.Layer;

    constructor(layer: Konva.Layer) {
        super();
        this.layer = layer;
    }

    public drawElements(): void {
        const thisPlayerId = clientState.localPlayerId;
        // MARK: draw playmats
        const matOffsets = [20, 140, 260, 380];
        clientState.received.players.forEach(player => {
            const matOffset = matOffsets.shift() as number;
            const isLocalPlayer = player.id === thisPlayerId;

            const playMat = new PlayMat(
                player,
                isLocalPlayer,
                COLOR[player.id],
                this.matchPlayerColor(COLOR[player.id]),
                matOffset
            );
            this.layer.add(playMat.getElement());
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

    private matchPlayerColor(playerColor: string): Color {
        switch (playerColor) {
            case COLOR.playerRed:
                return COLOR.holdDarkRed;
            case COLOR.playerPurple:
                return COLOR.holdDarkPurple;
            case COLOR.playerGreen:
                return COLOR.holdDarkGreen;
            case COLOR.playerYellow:
                return COLOR.holdDarkYellow;
            default:
                return COLOR.holdDarkRed;
        }
    }
}