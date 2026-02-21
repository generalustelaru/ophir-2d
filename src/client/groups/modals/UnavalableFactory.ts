import Konva from 'konva';
import { GroupFactory, GroupLayoutData } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import clientConstants from '~/client/client_constants';

const { LAYERED_ICONS } = clientConstants;

export class UnavailableFactory implements Unique<GroupFactory> {

    private layout: GroupLayoutData;

    constructor(position: Coordinates) {
        this.layout = { ...position, width: 30, height: 30 };
    }

    public produceElement(): Konva.Group {
        const scale = 2;
        const iconData = LAYERED_ICONS.unavailable;
        const { shape: outerShape, fill: outerFill } = iconData.layer_1;
        const { shape: innerShape, fill: innerFill } = iconData.layer_2;

        return new Konva.Group({
            ...this.layout,
        }).add(
            new Konva.Path({
                data: outerShape,
                fill: outerFill,
                scale: { x: scale, y: scale },
            }),
            new Konva.Path({
                data: innerShape,
                fill: innerFill,
                scale: { x: scale, y: scale },
            }),
        ).hide();
    }
}
