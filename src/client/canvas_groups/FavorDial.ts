import Konva from 'konva';
import clientConstants from '../client_constants';
import { DynamicGroupInterface, GroupLayoutData } from '../client_types';

const { ICON_DATA, COLOR } = clientConstants;
export class FavorDial implements DynamicGroupInterface<number | null> {
    private group: Konva.Group;
    private favorCount: Konva.Text | null;

    constructor(
        favor: number | null,
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({
            x: layout.x,
            y: layout.y,
        });
        const outerStamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_outer.shape,
            fill: ICON_DATA.favor_stamp_outer.fill,
            stroke: COLOR.stampEdge,
            strokeWidth: 2,
            scale: { x: 2, y: 2 },
        });

        const innerStamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_inner.shape,
            fill: ICON_DATA.favor_stamp_inner.fill,
            stroke: COLOR.stampEdge,
            strokeWidth: 1,
            scale: { x: 2, y: 2 },
        });

        const stampCenter = outerStamp.getClientRect().width / 2;

        this.favorCount = favor ? new Konva.Text({
            x: stampCenter - 7,
            y: stampCenter - 12,
            text: favor.toString(),
            fontSize: 20,
            fill: COLOR.boneWhite,
            fontFamily: 'Arial',
        }) : null;

        this.group.add(outerStamp, innerStamp);

        if (this.favorCount) {
            this.group.add(this.favorCount);
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(favor: number): void {
        this.favorCount?.text(favor.toString());
    }
}