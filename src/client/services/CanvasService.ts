import Konva from 'konva';
import { Coordinates, GameSetupDetails } from '../../shared_types';
import { Service, ServiceInterface } from "./Service";
import { MapSegmentPainter } from './MapBoardService';
import { PlayerSegmentPainter } from './PlayerZoneService';
import clientConstants from '../client_constants';
export interface CanvasInterface extends ServiceInterface {
    getSetupCoordinates(): GameSetupDetails,
    drawElements(): void,
    updateElements(): void,
}

const { SHIP_DATA } = clientConstants;

export class CanvasService extends Service implements CanvasInterface {
    private stage: Konva.Stage;
    private layer: Konva.Layer;
    private mapSegment: MapSegmentPainter;
    private playerSegment: PlayerSegmentPainter;
    private centerPoint: Coordinates;

    public constructor() {
        super();
        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: true,
            opacity: 1,
            width: 750,
            height: 500,
        });
        this.centerPoint = { x: 250, y: this.stage.height() / 2 };
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        this.layer.draw();

        this.mapSegment = MapSegmentPainter.getInstance([this.stage, this.centerPoint]);
        this.playerSegment = PlayerSegmentPainter.getInstance([this.layer]);
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
        this.mapSegment.drawElements();
        this.playerSegment.drawElements();
    }

    public updateElements(): void {
        this.mapSegment.updateElements();
        this.playerSegment.updateElements();
    }
}
