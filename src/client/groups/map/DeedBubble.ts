import Konva from 'konva';
import { DynamicGroupInterface } from '~/client/client_types';
import { Coordinates, BubbleDeed, Unique } from '~/shared_types';
import clientConstants from '~/client/client_constants';

type Update = {
    isVisible: boolean
    deeds: Array<BubbleDeed>
}
const { HUES } = clientConstants;
const unit = { width: 30, height: 30 } as const;
export class DeedBubble implements Unique<DynamicGroupInterface<Update>> {
    private group: Konva.Group;
    private deeds: Array<BubbleDeed> = [];
    private bubble: Konva.Rect;

    constructor(
        position: Coordinates,
    ) {
        const realPosition = {
            x: position.x - unit.width / 2,
            y: position.y,
        };

        this.group = new Konva.Group({
            ...realPosition,
        });

        this.bubble = new Konva.Rect({
            fill: HUES.boneWhite,
            cornerRadius: 15,
            height: unit.height,
        });

        const pointer = new Konva.Line({
            points: [
                0, 0,      // tip (bottom center)
                -15, -35,  // top left
                15, -35,   // top right
            ],
            x: 15,
            y: 50,
            closed: true,
            fill: HUES.boneWhite,
        });

        this.group.add(pointer, this.bubble);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(data: Update) {
        const { deeds, isVisible } = data;
        this.deeds = deeds;
        this.group.visible(isVisible);

        if (isVisible) {
            const width = unit.width * deeds.length || unit.width;
            this.bubble.width(width);
            this.bubble.x((width / 2 * -1) + (unit.width / 2));
        }
    }
}
