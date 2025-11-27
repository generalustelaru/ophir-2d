
import Konva from 'konva';
import { Vector2d } from 'konva/lib/types';
import { Coordinates, ZoneName, DiceSix, Player, LocationName, Action, ItemSupplies, Rival, Unique } from '~/shared_types';
import { Color, DynamicGroupInterface, IslandData, IconLayer } from '~/client_types';
import { LocationToken } from '.';
import clientConstants from '~/client_constants';

const { COLOR, ICON_DATA } = clientConstants;

type SeaZoneUpdate = {
    localPlayer: Player | null,
    rival: Rival,
    templeIcon: IconLayer,
    itemSupplies: ItemSupplies,
}

export class SeaZone implements Unique<DynamicGroupInterface<SeaZoneUpdate>> {

    private group: Konva.Group;
    private hexagon: Konva.RegularPolygon;
    private island: Konva.Path;
    private location: LocationToken;
    private restrictedIcon: Konva.Path;
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
        isPlay: boolean,
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

        this.island = new Konva.Path({
            x: island.x,
            y: island.y,
            data: island.shape,
            fill: COLOR.islandGreen,
            scale: { x: 7.5, y: 7.5 },
            strokeWidth: 1,
        });

        this.location = new LocationToken(stage, locationId, iconData, isPlay);

        this.restrictedIcon = new Konva.Path({
            x: -75,
            y: -75,
            data: ICON_DATA.restricted.shape,
            fill: ICON_DATA.restricted.fill,
            scale: { x: 2, y: 2 },
            visible: false,
        });

        this.group.add(
            this.hexagon,
            this.island,
            this.location.getElement(),
            this.restrictedIcon,
        );
    }

    public update(update: SeaZoneUpdate): void {
        this.saveFill(COLOR.defaultHex);

        const { localPlayer, rival } = update;

        this.location.update({
            tradeGoodSupplies: update.itemSupplies.goods,
            mayPickup: (
                localPlayer?.bearings.seaZone == this.getZoneName()
                && localPlayer.locationActions.includes(Action.load_good)
            ),
            templeIcon: update.templeIcon,
        });

        if (!localPlayer || !localPlayer.isActive)
            return;

        if (localPlayer.isHandlingRival)
            this.updateForRival(rival);
        else
            this.updateForPlayer(localPlayer);
    }

    private updateForRival(rival: Rival) {

        if (!rival.isIncluded)
            return;

        const { bearings, moves, destinations } = rival;

        if (
            bearings.seaZone == this.getZoneName()
            && bearings.location == 'market'
            && moves < 2
        ) {
            // rival is here and may shift the market
            this.saveFill(COLOR.navigatorAccess);
        } else if (
            destinations.includes(this.getZoneName())
            && moves > 0
        ) {
            // local player may still move and is able to enter this zone
            this.saveFill(COLOR.activeHex);
        }
    }

    private updateForPlayer(localPlayer: Player) {
        if (
            localPlayer.bearings.seaZone == this.getZoneName()
            && localPlayer.isAnchored
            && localPlayer.locationActions.length
        ) {
            // local player is here and may perform actions
            this.saveFill(COLOR.navigatorAccess);
        } else if (
            localPlayer.moveActions > 0
            && (
                localPlayer.destinations.includes(this.getZoneName())
                || localPlayer.navigatorAccess.includes(this.getZoneName())
            )
        ) {
            // local player may still move and is able to enter this zone
            this.saveFill(COLOR.activeHex);
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }
    public getZoneName(): ZoneName {
        return this.group.attrs.id as ZoneName;
    }

    public getLocationName(): LocationName {
        return this.location.getId();
    }


    public setFill(color: Color): void {
        this.hexagon.fill(color);
    }

    public setValid(): void {
        this.hexagon.fill(COLOR.validHex);
    }

    public setRollDependant(value: DiceSix): void {
        const dangerHue = ((): Color => {
            switch(true) {
                case value < 3: return COLOR.lowRoll;
                case value < 5: return COLOR.midRoll;
                default: return COLOR.highRoll;
            }
        })();
        this.hexagon.fill(dangerHue);
    }

    public setValidForNavigator(): void {
        this.hexagon.fill(COLOR.navigatorAccess);
    }

    public setRestricted(): void {
        this.restrictedIcon.visible(true);
        this.setFill(COLOR.illegal);
    }

    public resetFill(): void {
        this.hexagon.fill(this.staticFill);
        this.restrictedIcon.visible(false);
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
}

