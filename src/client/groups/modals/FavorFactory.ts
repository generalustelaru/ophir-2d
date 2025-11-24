import Konva from 'konva';
import { GroupFactory, GroupLayoutData } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import clientConstants from '~/client/client_constants';

const { ICON_DATA, COLOR, LOCATION_TOKEN_DATA } = clientConstants;

export class FavorFactory implements Unique<GroupFactory> {

    private layout: GroupLayoutData;

    constructor(position: Coordinates) {
        this.layout = { ...position, width: 30, height: 30 };
    }

    public produceElement(): Konva.Group {
        const scale = 1;
        const { shape: innerShape, fill: innerFill } = ICON_DATA.favor_stamp_inner;
        const { shape: outerShape, fill: outerFill } = ICON_DATA.favor_stamp_outer;
        const { shape: templeShape } = LOCATION_TOKEN_DATA.temple;
        const { stampEdge } = COLOR;

        return new Konva.Group({
            ...this.layout,
        }).add(...[
            // outer stamp
            new Konva.Path({
                data: outerShape,
                fill: outerFill,
                stroke: stampEdge,
                strokeWidth: 2,
                scale: { x: scale, y: scale },
            }),
            // inner stamp
            new Konva.Path({
                data: innerShape,
                fill: innerFill,
                stroke: stampEdge,
                strokeWidth: 1,
                scale: { x: scale, y: scale },
            }),
            // temple icon
            new Konva.Path({
                data: templeShape,
                fill: stampEdge,
                scale: { x: scale + 1/6 * scale, y: 3/4 * scale },
                x: scale * 7,
                y: scale * 7,
            }),
        ]);
    }
}
