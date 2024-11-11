import Konva from 'konva';
import { GameSetupDetails } from '../../shared_types';
import { Service, ServiceInterface } from "./Service";
import { LocationGroup } from '../canvas_mega_groups/LocationGroup';
import { MapGroup } from '../canvas_mega_groups/MapGroup';
import { PlayMatGroup } from '../canvas_mega_groups/PlayMatGroup';
import { GroupLayoutData } from '../client_types';
import clientState from '../state';

export interface CanvasInterface extends ServiceInterface {
    getSetupCoordinates(): GameSetupDetails,
    drawElements(): void,
    updateElements(): void,
}

export class CanvasService extends Service implements CanvasInterface {
    private stage: Konva.Stage;
    private locationGroup: LocationGroup;
    private mapGroup: MapGroup;
    private playMatGroup: PlayMatGroup;

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

        const segmentWidth = this.stage.width()/4;
        const layout: GroupLayoutData = {
            height: this.stage.height(),
            width: segmentWidth,
            x: segmentWidth,
            setWidth: function(width: number) { this.width = width; return this; },
            setX: function(rightDrift: number) { this.x = rightDrift; return this; },
        };

        this.locationGroup = new LocationGroup();
        this.mapGroup = new MapGroup(this.stage, layout.setWidth(segmentWidth*2).setX(segmentWidth)); // mapGroup covers half the canvas (2 segments), sitting in the middle
        this.playMatGroup = new PlayMatGroup(this.stage, layout.setX(segmentWidth*3));
    }

    public getSetupCoordinates(): GameSetupDetails {
        return this.mapGroup.calculateShipPositions();
    }

    public drawElements(): void {
        this.locationGroup.drawElements();
        this.mapGroup.drawElements();
        this.playMatGroup.drawElements();

        if (!clientState.localPlayerId) {
            this.broadcastEvent('info', {text: 'You are a spectator'});
        }
    }

    public updateElements(): void {
        this.locationGroup.updateElements();
        this.mapGroup.updateElements();
        this.playMatGroup.updateElements();
    }
}
