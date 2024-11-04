import Konva from 'konva';
import { Coordinates } from '../../shared_types';
import { Service, ServiceInterface } from "./Service";
import { MapBoardService, MapBoardInterface } from './MapBoardService';

export interface CanvasInterface extends ServiceInterface {
    initiateCanvas: () => void,
    drawElements: () => void,
    updateElements: () => void,
}

export class CanvasService extends Service implements CanvasInterface {
    stage: Konva.Stage;
    layer: Konva.Layer;
    center: Coordinates;
    mapBoardService: MapBoardInterface;

    constructor() {
        super();
    }

    initiateCanvas = () => {
        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: true,
            opacity: 1,
            width: 750,
            height: 500,
        });
        this.center = { x: 250, y: this.stage.height() / 2 };
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        this.layer.draw();

        this.mapBoardService = MapBoardService.getInstance();
    }

    drawElements = () => {
        this.mapBoardService.drawBoard(this.stage, this.layer, this.center);
    }

    updateElements = () => {
        this.mapBoardService.updateBoard();
    }
}