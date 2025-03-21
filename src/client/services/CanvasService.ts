import Konva from 'konva';
import { GameSetupPayload, GameState } from '../../shared_types';
import { Communicator } from "./Communicator";
import { LocationGroup } from '../mega_groups/LocationGroup';
import { MapGroup } from '../mega_groups/MapGroup';
import { PlayerGroup } from '../mega_groups/PlayerGroup';
import localState from '../state';

class CanvasClass extends Communicator {
    private stage: Konva.Stage;
    private locationGroup: LocationGroup;
    private mapGroup: MapGroup;
    private playerGroup: PlayerGroup;
    private isDrawn = false;

    public constructor() {
        super();
        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: true,
            opacity: 1,
            width: 1200,
            height: 500,
        });
        const layer = new Konva.Layer();
        this.stage.add(layer);
        layer.draw();

        const segmentWidth = this.stage.width() / 4;

        this.locationGroup = new LocationGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: segmentWidth,
                x: 0,
                y: 0,
            },
        ); // locationGroup covers 1 segment, sitting on the left

        this.playerGroup = new PlayerGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: segmentWidth,
                x: segmentWidth * 3,
                y: 0,
            },
        ); // playerGroup covers 1 segment, sitting on the right

        this.mapGroup = new MapGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: segmentWidth * 2,
                x: segmentWidth,
                y: 0,
            },
        ); // mapGroup covers half the canvas (2 segments), sitting in the middle
    }

    public getSetupCoordinates(): GameSetupPayload {
        return this.mapGroup.createSetupPayload();
    }

    private drawElements(state: GameState): void {
        this.locationGroup.drawElements(state);
        this.playerGroup.drawElements(state);
        this.mapGroup.drawElements(state);

        if (!localState.playerColor) {
            this.broadcastEvent({
                type: 'info',
                detail: { text: 'You are a spectator' }
            });
        }
        this.isDrawn = true;
    }

    public drawUpdateElements(state:GameState, disable = false): void {
        if (state.isStatusResponse) {
            return;
        }

        if(!this.isDrawn)
            this.drawElements(state);

        this.locationGroup.update(state);
        this.mapGroup.update(state);
        this.playerGroup.update(state);
        disable && this.disable();
    }

    public disable(): void {
        this.locationGroup.disable();
        this.mapGroup.disable();
        this.playerGroup.disable();
    }
}

export const CanvasService = new CanvasClass();
