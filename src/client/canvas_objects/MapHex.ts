
import Konva from 'konva';
import { Coordinates, HexId } from '../../shared_types';
import { Color, MapHexInterface, IslandData, SettlementData } from '../client_types';
import { Vector2d } from 'konva/lib/types';
import { LocationToken } from './LocationToken';
import clientConstants from '../client_constants';

const { COLOR } = clientConstants;

export class MapHex implements MapHexInterface {

    private group: Konva.Group;
    private hexagon: Konva.RegularPolygon;
    private island: Konva.Path;
    private settlement: Konva.Group;

    constructor(
        center: Coordinates,
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

    public getElement(): Konva.Group {
        return this.group;
    }
    public getId(): HexId {
        return this.group.attrs.id as HexId;
    }
    public setFill(color: Color): void {
        this.hexagon.fill(color);
    }
    public isIntersecting(vector: Vector2d): boolean {
        return this.hexagon.intersects(vector);
    }
}

