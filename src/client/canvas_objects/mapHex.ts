
import Konva from 'konva';
import { HexId } from '../../shared_types';
import { HexaColor, MapHexInterface, IslandData} from '../client_types';
import { Vector2d } from 'konva/lib/types';
import clientConstants from '../client_constants';

const { COLOR } = clientConstants;

export class MapHex implements MapHexInterface {

    group: Konva.Group;
    hexagon: Konva.RegularPolygon;
    island: Konva.Path;

    constructor(
        center: {x: number, y: number},
        name: HexId,
        offsetX:number,
        offsetY:number,
        island: IslandData,
        fill: HexaColor
    ) {

        this.group = new Konva.Group({
            width: 100,
            height: 100,
            x: center.x,
            y: center.y,
            offsetX,
            offsetY,
            id: name,
        });

        this.hexagon = new Konva.RegularPolygon({
            sides: 6,
            radius: 100,
            fill: fill,
            stroke: 'black',
            strokeWidth: 1,
        });

        this.group.add(this.hexagon);

        this.island = new Konva.Path({
            x: island.x,
            y: island.y,
            data: island.shape,
            fill: COLOR.islandGreen,
            scale: {x: 7, y: 7},
            strokeWidth: 1,
        });

        this.group.add(this.island);
    }

    public getElement = () => this.group;
    public getId = () => this.group.attrs.id as HexId;
    public setFill = (color: HexaColor) => this.hexagon.fill(color);
    public isIntersecting = (vector: Vector2d) => this.hexagon.intersects(vector);
}

