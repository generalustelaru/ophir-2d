
import Konva from 'konva';
import { Coordinates, HexId, DiceSix } from '../../shared_types';
import { Color, MapHexInterface, IslandData, SettlementData } from '../client_types';
import { Vector2d } from 'konva/lib/types';
import clientConstants from '../client_constants';
import { BoneIcon, LocationToken } from './CanvasGroups';

const { COLOR, ICON_DATA } = clientConstants;

export class MapHex implements MapHexInterface {

    private group: Konva.Group;
    private hexagon: Konva.RegularPolygon;
    private island: Konva.Path;
    private settlement: Konva.Group;
    private restrictedIcon: Konva.Path;
    private boneIcon: BoneIcon;

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

        this.restrictedIcon = new Konva.Path({
            x: -75,
            y: -75,
            data: ICON_DATA.restricted.shape,
            fill: ICON_DATA.restricted.fill,
            scale: {x: 2, y: 2},
            visible: false,
        });
        this.group.add(this.restrictedIcon);

        this.boneIcon = new BoneIcon();
        this.group.add(this.boneIcon.getElement());
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
    public setRestricted(how: boolean): void { //TODO: implement multiple states and control the details from here (icon and fill)
        this.restrictedIcon.visible(how);
        this.setFill(how ? COLOR.emptyHex : COLOR.emptyHex);
    }

    public setBoneIcon(value: DiceSix|false): void {
        this.boneIcon.display(value);
    }
    public isIntersecting(vector: Vector2d|null): boolean {
        if (!vector) {
            return false;
        }

        return this.hexagon.intersects(vector);
    }
}

