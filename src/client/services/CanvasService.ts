import Konva from 'konva';
import { Coordinates, GameSetupDetails } from '../../shared_types';
import { Service, ServiceInterface } from "./Service";
import { MapGroup } from '../canvas_groups/MapGroup';
import { PlayMatGroup } from '../canvas_groups/PlayMatGroup';
import clientConstants from '../client_constants';
import { GroupLayoutData } from '../client_types';

export interface CanvasInterface extends ServiceInterface {
    getSetupCoordinates(): GameSetupDetails,
    drawElements(): void,
    updateElements(): void,
}

const { SHIP_DATA } = clientConstants;

export class CanvasService extends Service implements CanvasInterface {
    private stage: Konva.Stage;
    private layer: Konva.Layer;
    private mapGroup: MapGroup;
    private playMatGroup: PlayMatGroup;
    private centerPoint: Coordinates;

    public constructor() {
        super();
        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: true,
            opacity: 1,
            width: 1200,
            height: 500,
        });
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        this.layer.draw();
        this.centerPoint = { x: this.stage.width()/2, y: this.stage.height()/2 };
        const segmentWidth = this.stage.width()/4;

        const layout: GroupLayoutData = {
            width: segmentWidth,
            height: this.stage.height(),
            x: 0,
            setX: function(drift: number) { this.x = drift; return this; },
        };

        this.mapGroup = new MapGroup(this.stage);
        this.playMatGroup = new PlayMatGroup(this.layer, layout.setX(segmentWidth*3));
    }

    public getSetupCoordinates(): GameSetupDetails {
        const startingPositions: Array<Coordinates> = [];

        SHIP_DATA.setupDrifts.forEach((drift) => {
            startingPositions.push({
                x: this.centerPoint.x + drift.x,
                y: this.centerPoint.y + drift.y
            });
        });

        return { setupCoordinates: startingPositions };
    }

    public drawElements(): void {
        this.mapGroup.drawElements();
        this.playMatGroup.drawElements();
    }

    public updateElements(): void {
        this.mapGroup.updateElements();
        this.playMatGroup.updateElements();
    }
}
