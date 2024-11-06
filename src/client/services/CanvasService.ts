import Konva from 'konva';
import { Coordinates } from '../../shared_types';
import { Service, ServiceInterface } from "./Service";
import { MapBoardService, MapBoardInterface } from './MapBoardService';
import clientConstants from '../client_constants';
export interface CanvasInterface extends ServiceInterface {
    drawElements: () => void,
    updateElements: () => void,
}

const { SHIP_DATA, EVENT } = clientConstants;

export class CanvasService extends Service implements CanvasInterface {
    stage: Konva.Stage;
    layer: Konva.Layer;
    mapBoardService: MapBoardInterface;

    constructor() {
        super();
        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: true,
            opacity: 1,
            width: 750,
            height: 500,
        });
        const calculatedCenter = { x: 250, y: this.stage.height() / 2 };
        const setupCoordinates = this.calculateDrifts(calculatedCenter);
        this.broadcastEvent(
            EVENT.action,
            { action: 'setup', playerPositions: setupCoordinates }
        );
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        this.layer.draw();

        this.mapBoardService = MapBoardService.getInstance([this.stage, this.layer, calculatedCenter]);
    }

    drawElements = () => {
        this.mapBoardService.drawBoard();
    }

    updateElements = () => {
        this.mapBoardService.updateBoard();
    }

    private calculateDrifts = (center: Coordinates): Array<Coordinates> => {
        const drifts: Array<Coordinates> = [];

        SHIP_DATA.setupDrifts.forEach((drift) => {
            drifts.push({
                x: center.x + drift.x,
                y: center.y + drift.y
            });
        });

        return drifts;
    }
}
