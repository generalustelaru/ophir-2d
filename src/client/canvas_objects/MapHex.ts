
import Konva from 'konva';
import { HexId } from '../../shared_types';
import { Color, MapHexInterface, IslandData, SettlementData } from '../client_types';
import { Vector2d } from 'konva/lib/types';
import { LocationToken } from './LocationToken';
import clientConstants from '../client_constants';

const { COLOR } = clientConstants;

export class MapHex implements MapHexInterface {

    group: Konva.Group;
    hexagon: Konva.RegularPolygon;
    island: Konva.Path;
    settlement: Konva.Group;

    constructor(
        center: {x: number, y: number},
        name: HexId,
        offsetX:number,
        offsetY:number,
        island: IslandData,
        settlement: SettlementData,
        fill: Color
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
            scale: {x: 7.5, y: 7.5},
            strokeWidth: 1,
        });

        this.group.add(this.island);

        this.settlement = new LocationToken(settlement).getElement();
        this.group.add(this.settlement);
    }

    public getElement() {
        return this.group;
    }
    public getId() {
        return this.group.attrs.id as HexId;
    }
    public setFill(color: Color) {
        this.hexagon.fill(color);
    }
    public isIntersecting(vector: Vector2d) {
        return this.hexagon.intersects(vector);
    }
}

