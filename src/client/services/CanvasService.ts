import Konva from 'konva';
import { GameSetupDetails } from '../../shared_types';
import { Service, ServiceInterface } from "./Service";
import { LocationGroup } from '../canvas_mega_groups/LocationGroup';
import { MapGroup } from '../canvas_mega_groups/MapGroup';
import { PlayerCardGroup } from '../canvas_mega_groups/PlayerCardGroup';
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
    private playerCardGroup: PlayerCardGroup;

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

        const locationLayout: GroupLayoutData = {
            height: this.stage.height(),
            width: segmentWidth,
            x: 0,
        };
        this.locationGroup = new LocationGroup(this.stage, locationLayout); // locationGroup covers 1 segment, sitting on the left

        const mapLayout: GroupLayoutData = {
            height: this.stage.height(),
            width: segmentWidth*2,
            x: segmentWidth,
        };
        this.mapGroup = new MapGroup(this.stage, mapLayout); // mapGroup covers half the canvas (2 segments), sitting in the middle

        const playerCardLayout: GroupLayoutData = {
            height: this.stage.height(),
            width: segmentWidth,
            x: segmentWidth*3,
        };
        this.playerCardGroup = new PlayerCardGroup(this.stage, playerCardLayout);
    }

    public getSetupCoordinates(): GameSetupDetails {
        return this.mapGroup.calculateShipPositions();
    }

    public drawElements(): void {
        this.locationGroup.drawElements();
        this.mapGroup.drawElements();
        this.playerCardGroup.drawElements();

        if (!clientState.localPlayerId) {
            this.broadcastEvent('info', {text: 'You are a spectator'});
        }
    }

    public updateElements(): void {
        this.locationGroup.updateElements();
        this.mapGroup.updateElements();
        this.playerCardGroup.updateElements();
    }
}
