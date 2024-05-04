
import Konva from 'konva';
import { HexId, HexaColor } from '../../shared_types';

export class MapHex {
    constructor(
        center: {x: number, y: number},
        name: HexId,
        offsetX:number,
        offsetY:number,
        fill: HexaColor
    ) {

        return new Konva.RegularPolygon({
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
}

