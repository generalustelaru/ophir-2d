
import Konva from 'konva';
import constants from '../constants.json';


export class MapHex {
    constructor(width:number, name: string, x:number, y:number, fill:string) {

        return new Konva.RegularPolygon({
            x: width / 2,
            y: width / 2,
            offsetX: x,
            offsetY: y,
            sides: 6,
            radius: 100,
            fill: fill,
            stroke: 'black',
            strokeWidth: 1,
            id: name,
        });
    }
}

