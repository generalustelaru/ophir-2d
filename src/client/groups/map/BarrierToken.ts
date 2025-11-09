import Konva from 'konva';
import constants from '~/client_constants';
import { BarrierId, Unique } from '~/shared_types';
import { StaticGroupInterface } from '~/client_types';

const { COLOR } = constants;

type OffsetData = {x: number, y: number, rotation: number};

const barrierOffsets: Record <BarrierId, OffsetData> = {
    1: { x: -13, y: -200, rotation: 0 },
    2: { x: -7, y: -89, rotation: -60 },
    3: { x: 165, y: -112, rotation: 60 },
    4: { x: 73, y: -50, rotation: 0 },
    5: { x: 79, y: 61, rotation: -60 },
    6: { x: 80, y: 38, rotation: 60 },
    7: { x: -12, y: 100, rotation: 0 },
    8: { x: -92, y: 61, rotation: -60 },
    9: { x: -92, y: 39, rotation: 60 },
    10: { x: -98, y: -50, rotation: 0 },
    11: { x: -179, y: -89, rotation: -60 },
    12: { x: -6, y: -111, rotation: 60 },
};

export class BarrierToken implements Unique<StaticGroupInterface> {

    private group: Konva.Group;
    constructor(
        center: {x: number, y: number},
        barrierId: BarrierId,
        fill: string = COLOR.barrierDefault,
    ) {
        this.group = new Konva.Group({});
        const rect = new Konva.Rect({
            x: center.x + barrierOffsets[barrierId].x,
            y: center.y + barrierOffsets[barrierId].y,
            cornerRadius: 5,
            rotation: barrierOffsets[barrierId].rotation,
            width: 26,
            height: 100,
            fill: fill,
        });

        this.group.add(rect);
    }

    public getElement = () => {
        return this.group;
    };
}