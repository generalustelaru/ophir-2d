
import Konva from 'konva';
import { Vector2d } from 'konva/lib/types';
import { Coordinates, ZoneName, DiceSix, Player, LocationName, Action, ItemSupplies, Rival } from '~/shared_types';
import { Color, DynamicGroupInterface, IslandData, IconLayer } from '~/client_types';
import { InfluenceDial } from '../popular';
import { LocationToken } from '.';
import clientConstants from '~/client_constants';

const { COLOR, ICON_DATA } = clientConstants;

type SeaZoneUpdate = {
    player: Player | null,
    rival: Rival,
    templeIcon: IconLayer | null,
    itemSupplies: ItemSupplies,
}

export class SeaZone implements DynamicGroupInterface<SeaZoneUpdate> {

    private group: Konva.Group;
    private hexagon: Konva.RegularPolygon;
    private island: Konva.Path;
    private location: LocationToken;
    private restrictedIcon: Konva.Path;
    private influenceDial: InfluenceDial;
    private staticFill: Color;

    constructor(
        stage: Konva.Stage,
        center: Coordinates,
        name: ZoneName,
        offsetX: number,
        offsetY: number,
        island: IslandData,
        locationId: LocationName,
        iconData: IconLayer,
        fill: Color,
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

        this.staticFill = fill;
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
            scale: { x: 7.5, y: 7.5 },
            strokeWidth: 1,
        });
        this.group.add(this.island);

        this.location = new LocationToken(stage, locationId, iconData);
        this.group.add(this.location.getElement());

        this.restrictedIcon = new Konva.Path({
            x: -75,
            y: -75,
            data: ICON_DATA.restricted.shape,
            fill: ICON_DATA.restricted.fill,
            scale: { x: 2, y: 2 },
            visible: false,
        });
        this.group.add(this.restrictedIcon);

        this.influenceDial = new InfluenceDial(
            { x: -25, y: -25 },
            COLOR.boneWhite,
        );
        this.group.add(this.influenceDial.getElement());
    }

    update(update: SeaZoneUpdate): void {
        const localPlayer = update.player;
        this.saveFill(COLOR.defaultHex);

        if (!localPlayer || !localPlayer.isActive)
            return;

        if (
            // local player is here and may perform actions
            localPlayer.bearings.seaZone == this.getId()
            && localPlayer.isAnchored
            && localPlayer.locationActions.length
        ) {
            this.saveFill(COLOR.navigatorAccess);
        } else if (
            // local player may still move and is able to enter this zone
            localPlayer.moveActions > 0
            && (
                localPlayer.destinations.includes(this.getId())
                || localPlayer.navigatorAccess.includes(this.getId())
            )
        ) {
            this.saveFill(COLOR.activeHex);
        }

        // if (
        //     (
        //         // local player is here and may perform actions
        //         localPlayer.bearings.seaZone == this.getId()
        //         && localPlayer.isAnchored
        //         && localPlayer.locationActions.length
        //     ) || (
        //         // local player may still move and is able to enter this zone
        //         localPlayer.moveActions > 0
        //         && (
        //             localPlayer.destinations.includes(this.getId())
        //             || localPlayer.navigatorAccess.includes(this.getId())
        //         )
        //     )
        // ) {
        //     this.saveFill(COLOR.activeHex);
        // }

        this.location.update({
            tradeGoodSupplies: update.itemSupplies.goods,
            mayPickup: (
                localPlayer.locationActions.includes(Action.load_good)
                && localPlayer.cargo.includes('empty')
            ),
            templeIcon: update.templeIcon,
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }
    public getId(): ZoneName {
        return this.group.attrs.id as ZoneName;
    }

    public getTokenId(): LocationName {
        return this.location.getId();
    }


    public setFill(color: Color): void {
        this.hexagon.fill(color);
    }

    public setValid(): void {
        this.hexagon.fill(COLOR.validHex);
    }

    public setRollDependant(value: DiceSix): void {
        this.setToHitValue(value);
    }

    public setValidForNavigator(): void {
        this.hexagon.fill(COLOR.navigatorAccess);
    }

    public setRestricted(): void {
        this.restrictedIcon.visible(true);
        this.setFill(COLOR.illegal);
        // this.saveFill(how ? COLOR.emptyHex : COLOR.emptyHex);
    }

    public resetFill(): void {
        this.hexagon.fill(this.staticFill);
        this.restrictedIcon.visible(false);
        this.setToHitValue(false);
    }



    public isIntersecting(vector: Vector2d | null): boolean {
        if (!vector) {
            return false;
        }

        return this.hexagon.intersects(vector);
    }

    private saveFill(color: Color): void {
        this.hexagon.fill(color);
        this.staticFill = color;
    }

    private setToHitValue(value: DiceSix | false): void {
        this.influenceDial.update({ value, color: null });
    }
}

