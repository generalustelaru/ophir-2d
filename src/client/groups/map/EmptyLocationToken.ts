import Konva from 'konva';
import { DynamicGroupInterface, Unique } from '~/client_types';
import clientConstants from '~/client_constants';

const { LAYERED_ICONS } = clientConstants;

export class EmptyLocationToken implements Unique<DynamicGroupInterface<boolean>> {
    private group: Konva.Group;

    constructor(
    ) {
        this.group = new Konva.Group();

        const iconData = LAYERED_ICONS.empty_location;
        const scale = 3;
        const drift = { x: -21, y: -21 };

        const backgroundData = iconData.layer_1;
        const background = new Konva.Path({
            data: backgroundData.shape,
            fill: backgroundData.fill,
            x: drift.x,
            Y: drift.y,
            scale: { x: scale, y: scale },
        });

        const foregroundData = iconData.layer_2;
        const foreground = new Konva.Path({
            data: foregroundData.shape,
            fill: foregroundData.fill,
            x: drift.x,
            Y: drift.y,
            scale: { x: scale, y: scale },
        });

        this.group.add(background, foreground);
        this.group.hide();
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(mayPickup: boolean) {
        mayPickup ? this.group.hide() : this.group.show();
    }
}