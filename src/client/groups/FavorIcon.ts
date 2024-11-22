
import Konva from 'konva';
import clientConstants from '../client_constants';
import { ColorProfile, DynamicGroupInterface, GroupLayoutData } from '../client_types';

const { ICON_DATA, COLOR, LOCATION_TOKEN_DATA } = clientConstants;

export class FavorIcon implements DynamicGroupInterface<ColorProfile> {
    private group: Konva.Group;
    public verticalAxis: number;
    public templeIcon: Konva.Path;
    private innerStamp: Konva.Path;
    private outerStamp: Konva.Path;

    constructor(
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({
            x: layout.x,
            y: layout.y,
            height: layout.height,
            width: layout.width,
        });
        this.outerStamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_outer.shape,
            fill: ICON_DATA.favor_stamp_outer.fill,
            stroke: COLOR.stampEdge,
            strokeWidth: 2,
            scale: { x: 2, y: 2 },
        });

        this.innerStamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_inner.shape,
            fill: ICON_DATA.favor_stamp_inner.fill,
            stroke: COLOR.stampEdge,
            strokeWidth: 1,
            scale: { x: 2, y: 2 },
        });

        this.templeIcon = new Konva.Path({
            data: LOCATION_TOKEN_DATA.temple.shape,
            fill: COLOR.stampEdge,
            scale: { x: 1, y: .7 },
            x: 13,
            y: 14,
        });

        this.verticalAxis = this.outerStamp.getClientRect().width / 2;

        this.group.add(this.outerStamp, this.innerStamp, this.templeIcon);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
    public getVerticalAxis(): number {
        return this.verticalAxis;
    }

    public updateElement(colorProfile: ColorProfile): void {
        this.templeIcon.fill(colorProfile.secondary);
        this.innerStamp.fill(colorProfile.primary);
        this.outerStamp.fill(colorProfile.primary);
        this.innerStamp.stroke(colorProfile.secondary);
        this.outerStamp.stroke(colorProfile.secondary);
    }
}