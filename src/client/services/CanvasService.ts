import Konva from 'konva';
import { Coordinates, GameSetupDetails } from '../../shared_types';
import { Service, ServiceInterface } from "./Service";
import { MapBoardService, MapBoardInterface } from './MapBoardService';
import clientConstants from '../client_constants';
export interface CanvasInterface extends ServiceInterface {
    getSetupCoordinates: () => GameSetupDetails,
    drawElements: () => void,
    updateElements: () => void,
}

const { SHIP_DATA, EVENT } = clientConstants;

export class CanvasService extends Service implements CanvasInterface {
    stage: Konva.Stage;
    layer: Konva.Layer;
    mapBoardService: MapBoardInterface;
    centerPoint: Coordinates;

    constructor() {
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

        this.mapBoardService = MapBoardService.getInstance([this.stage, this.layer, this.centerPoint]);
    }

    public getSetupCoordinates = () => {
        const startingPositions: Array<Coordinates> = [];

        SHIP_DATA.setupDrifts.forEach((drift) => {
            startingPositions.push({
                x: this.centerPoint.x + drift.x,
                y: this.centerPoint.y + drift.y
            });
        });

        return { setupCoordinates: startingPositions };
    }

    public drawElements = () => {
        this.mapBoardService.drawBoard();
    }

    public updateElements = () => {
        this.mapBoardService.updateBoard();
    }
}
