
import Konva from 'konva';
import clientConstants from '~/client_constants';
import { ColorProfile, DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';

const { ICON_DATA, COLOR, LOCATION_TOKEN_DATA } = clientConstants;

export class FavorIcon implements Unique<DynamicGroupInterface<ColorProfile>> {
    private group: Konva.Group;
    public verticalAxis: number;
    public templeIcon: Konva.Path;
    private innerStamp: Konva.Path;
    private outerStamp: Konva.Path;

    constructor(
        position: Coordinates,
        size: 'medium' | 'small' = 'medium',
    ) {
        const scale = size == 'medium' ? 2 : 1;

        this.group = new Konva.Group({
            ...position,
            height: 30 * scale,
            width: 30 * scale,
        });

        this.outerStamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_outer.shape,
            fill: ICON_DATA.favor_stamp_outer.fill,
            stroke: COLOR.stampEdge,
            strokeWidth: 2,
            scale: { x: scale, y: scale },
        });

        this.innerStamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_inner.shape,
            fill: ICON_DATA.favor_stamp_inner.fill,
            stroke: COLOR.stampEdge,
            strokeWidth: 1,
            scale: { x: scale, y: scale },
        });

        this.templeIcon = new Konva.Path({
            data: LOCATION_TOKEN_DATA.temple.shape,
            fill: COLOR.stampEdge,
            scale: { x: scale + 1/6 * scale, y: 3/4 * scale },
            x: scale * 7,
            y: scale * 7,
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

    public update(colorProfile: ColorProfile): void {
        this.templeIcon.fill(colorProfile.secondary);
        this.innerStamp.fill(colorProfile.primary);
        this.outerStamp.fill(colorProfile.primary);
        this.innerStamp.stroke(colorProfile.secondary);
        this.outerStamp.stroke(colorProfile.secondary);
    }
}