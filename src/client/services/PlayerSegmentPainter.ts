import Konva from 'konva';
import { CanvasSegmentInterface, Color} from '../client_types';
import { Service } from "./Service";
import { PlayMat } from '../canvas_objects/PlayMat';
import  clientConstants from '../client_constants';
import state from '../state';
import { PlayerId, SharedState } from '../../shared_types';


const { COLOR } = clientConstants;
export class PlayerSegmentPainter extends Service implements CanvasSegmentInterface {

    private layer: Konva.Layer;

    constructor(layer: Konva.Layer) {
        super();
        this.layer = layer;
    }

    public drawElements(): void {
        // MARK: draw cargo hold
        const cargoHold = new PlayMat(this.matchCargoHoldColor(COLOR[state.localPlayerId as PlayerId]));
        this.layer.add(cargoHold.getElement());
        state.konva.localCargoHold = cargoHold;
    }

    public updateElements(): void {
        const serverState = state.server as SharedState;
        const localPlayer = serverState.players[state.localPlayerId as PlayerId];

        if (localPlayer) {

            const localCargoHold = state.konva.localCargoHold as PlayMat;
            localCargoHold.updateHold(localPlayer.cargo);
        }
    }

    private matchCargoHoldColor(playerColor: string): Color {
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