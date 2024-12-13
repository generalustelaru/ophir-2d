import Konva from 'konva';
import { GameSetupDetails } from '../../shared_types';
import { Service } from "./Service";
import { LocationGroup } from '../mega_groups/LocationGroup';
import { MapGroup } from '../mega_groups/MapGroup';
import { PlayerGroup } from '../mega_groups/PlayerGroup';
import state from '../state';

export class CanvasService extends Service {
    private stage: Konva.Stage;
    private locationGroup: LocationGroup;
    private mapGroup: MapGroup;
    private playerGroup: PlayerGroup;

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

    public getSetupCoordinates(): GameSetupDetails {
        return this.mapGroup.calculateShipPositions();
    }

    public drawElements(): void {
        this.locationGroup.drawElements();
        this.playerGroup.drawElements();
        this.mapGroup.drawElements();

        if (!state.local.playerColor) {
            this.broadcastEvent('info', { text: 'You are a spectator' });
        }

        this.update();
    }

    public update(): void {
        if (state.received.isStatusResponse) {
            return;
        }

        this.locationGroup.update();
        this.mapGroup.update();
        this.playerGroup.update();
    }

    public disable(): void {
        this.locationGroup.disable();
        this.mapGroup.disable();
        this.playerGroup.disable();
    }
}
