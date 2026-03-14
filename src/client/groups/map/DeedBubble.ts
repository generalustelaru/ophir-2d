import Konva from 'konva';
import { DynamicGroupInterface } from '~/client/client_types';
import { Coordinates, BubbleDeed, Unique } from '~/shared_types';
import clientConstants from '~/client/client_constants';
import { DeedIconFactory } from './DeedIconFactory';

type Update = {
    isVisible: boolean
    deeds: Array<BubbleDeed>
}
const { HUES } = clientConstants;
const unit = { width: 30, height: 30 } as const;
export class DeedBubble implements Unique<DynamicGroupInterface<Update>> {
    private group: Konva.Group;
    private factory: DeedIconFactory;
    private nodes: Array<Konva.Group> = [];
    private bubble: Konva.Rect;

    constructor(
        position: Coordinates,
    ) {
        this.factory = new DeedIconFactory();
        const realPosition = {
            x: position.x - unit.width / 2,
            y: position.y,
        };
        this.group = new Konva.Group({ ...realPosition });

        this.bubble = new Konva.Rect({
            fill: HUES.boneWhite,
            cornerRadius: 15,
            height: unit.height,
        });

        const pointer = new Konva.Line({
            points: [
                0, 0,      // tip (bottom center)
                -14, -30,  // top left
                14, -30,   // top right
            ],
            x: 15,
            y: 51,
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
        this.group.visible(isVisible);

        if (false == isVisible)
            return;

        const width = unit.width * deeds.length || unit.width;
        this.bubble.width(width);
        this.bubble.x((width / 2 * -1) + (unit.width / 2));

        if (deeds.length == this.nodes.length)
            return;

        this.nodes.forEach(node => node.destroy());
        this.nodes = [];

        for (const deed of deeds) {
            const node = this.factory.getIcon(deed);
            node.x(this.bubble.x() + (this.nodes.length * unit.width));
            this.nodes.push(node);
        }
        this.group.add(...this.nodes);
    }
}
