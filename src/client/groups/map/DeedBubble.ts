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
    private renderedDeeds: Array<BubbleDeed> = [];
    private bubble: Konva.Rect;
    private pointer : Konva.Line;

    constructor(
        position: Coordinates,
    ) {
        this.factory = new DeedIconFactory(unit);
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

        this.pointer = new Konva.Line({
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

        this.group.add(this.pointer, this.bubble);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(data: Update) {
        const { deeds, isVisible } = data;
        this.group.visible(isVisible);
        const deedsCount = deeds.length;

        const isSame = (() => {
            if (deedsCount != this.nodes.length) return false;

            for (let i = 0; i < deedsCount; i++) if (deeds[i] != this.renderedDeeds[i]) return false;

            return true;
        })();

        if (isSame) return;

        const width = unit.width * deedsCount;
        this.bubble.width(width);
        this.bubble.x((width / 2 * -1) + (unit.width / 2));

        this.nodes.forEach(node => node.destroy());
        this.nodes = [];

        for (const deed of deeds) {
            const node = this.factory.getIcon(deed);
            node.x(this.bubble.x() + (this.nodes.length * unit.width));
            this.nodes.push(node);
        }
        this.group.add(...this.nodes);

        this.renderedDeeds = deeds;
    }

    public setVertical(y: number, collapse: boolean) {
        this.group.y(y);
        this.pointer.visible(collapse);
    }

    public peek(visible?: boolean) {
        if (visible)
            this.group.visible(visible);
        else
            this.group.visible(!this.group.visible());
    }
}

