
import Konva from 'konva';
import { Coordinates, HexId, DiceSix, Player, LocationId } from '../../../shared_types';
import { Color, DynamicGroupInterface, IslandData, LocationIconData } from '../../client_types';
import { Vector2d } from 'konva/lib/types';
import clientConstants from '../../client_constants';
import { InfluenceDial, LocationToken } from '../GroupList';

const { COLOR, ICON_DATA } = clientConstants;

type HexUpdate = {
    player: Player|null,
    templeIcon: LocationIconData | null,
}

export class MapHexagon implements DynamicGroupInterface<HexUpdate> {

    private group: Konva.Group;
    private hexagon: Konva.RegularPolygon;
    private island: Konva.Path;
    private location: LocationToken;
    private restrictedIcon: Konva.Path;
    private influenceDial: InfluenceDial;

    constructor(
        stage: Konva.Stage,
        center: Coordinates,
        name: HexId,
        offsetX:number,
        offsetY:number,
        island: IslandData,
        iconData: LocationIconData,
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

        this.location = new LocationToken(stage, iconData);
        this.group.add(this.location.getElement());

        this.restrictedIcon = new Konva.Path({
            x: -75,
            y: -75,
            data: ICON_DATA.restricted.shape,
            fill: ICON_DATA.restricted.fill,
            scale: {x: 2, y: 2},
            visible: false,
        });
        this.group.add(this.restrictedIcon);

        this.influenceDial = new InfluenceDial(
            {
                width: 50,
                height: 50,
                x: 25,
                y: 25,
            },
            COLOR.boneWhite
        );
        this.group.add(this.influenceDial.getElement());
    }

    updateElement(update: HexUpdate): void {
        const localPlayer = update.player;
        const canAct = (
            localPlayer?.hexagon.hexId === this.getId()
            && localPlayer.isActive
            && !!localPlayer.locationActions
            && localPlayer.isAnchored
        );

        this.setFill(canAct ? COLOR.activeHex : COLOR.defaultHex);

        this.location.updateElement({
            mayPickup: (
                canAct
                && !!localPlayer.locationActions?.includes('pickup_good')
                && localPlayer.cargo.includes('empty')
            ),
            templeIcon: update.templeIcon,
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }
    public getId(): HexId {
        return this.group.attrs.id as HexId;
    }

    public getTokenId(): LocationId {
        return this.location.getId();
    }
    public setFill(color: Color): void {
        this.hexagon.fill(color);
    }
    public setRestricted(how: boolean): void { //TODO: implement multiple states and control the details from here (icon and fill)
        this.restrictedIcon.visible(how);
        this.setFill(how ? COLOR.emptyHex : COLOR.emptyHex);
    }

    public setToHitValue(value: DiceSix|false): void {
        this.influenceDial.updateElement(value);
    }

    public isIntersecting(vector: Vector2d|null): boolean {
        if (!vector) {
            return false;
        }

        return this.hexagon.intersects(vector);
    }
}

