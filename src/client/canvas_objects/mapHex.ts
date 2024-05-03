
import Konva from 'konva';

export class MapHex {
    constructor(
        center: {x: number, y: number},
        name: string,
        offsetX:number,
        offsetY:number,
        fill:string
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

