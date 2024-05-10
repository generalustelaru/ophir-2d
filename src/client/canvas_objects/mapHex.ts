
import Konva from 'konva';
import { HexId } from '../../shared_types';
import { HexaColor, MapHexInterface} from '../client_types';
import { Vector2d } from 'konva/lib/types';

export class MapHex implements MapHexInterface {

    element: Konva.RegularPolygon;
    constructor(
        center: {x: number, y: number},
        name: HexId,
        offsetX:number,
        offsetY:number,
        fill: HexaColor
    ) {

        this.element = new Konva.RegularPolygon({
            x: center.x,
            y: center.y,
            offsetX,
            offsetY,
            sides: 6,
            radius: 100,
            fill: fill,
            stroke: 'black',
            strokeWidth: 1,
            id: name,
        });
    }

    public getElement = () => this.element;
    public getId = () => this.element.attrs.id as HexId;
    public setFill = (color: HexaColor) => this.element.fill(color);
    public isIntersecting = (vector: Vector2d) => this.element.intersects(vector);
}

