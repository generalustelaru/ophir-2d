import Konva from 'konva';
import clientConstants from '../client_constants';
import { DynamicGroupInterface } from '../client_types';

const { ICON_DATA, COLOR } = clientConstants;
export class FavorDial implements DynamicGroupInterface<number> {
    private group: Konva.Group;
    private favor: Konva.Text;

    constructor(
        favor: number,
    ) {
        this.group = new Konva.Group({
            x: 15,
            y: 40,
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

        const stampCenter = outerStamp.getClientRect().width/2;
        this.favor = new Konva.Text({
            x: stampCenter - 7,
            y: stampCenter - 12,
            text: favor.toString(),
            fontSize: 20,
            fill: COLOR.boneWhite,
            fontFamily: 'Arial',
        });

        this.group.add(outerStamp, innerStamp, this.favor);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(value: number): void {
        this.favor.text(value.toString());
    }
}