import Konva from 'konva';
import { GroupLayoutData, HighlightGroupInterface, LayerIds, Target } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import { Highlight } from './Highlight';

export class MapHighlightsGroup implements Unique<HighlightGroupInterface> {
    private group: Konva.Group;
    private highlights: Map<Target, Highlight>;
    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({ ...layout });
        stage.getLayers()[LayerIds.highlights].add(this.group);

        this.highlights = new Map<Target, Highlight>();
        const groupWidth = this.group.width();
        const groupHeight = this.group.height();

        const zoneDrifts = [
            { target: Target.topLeftZone, x: 86, y: 150 },
            { target: Target.topRightZone, x: -86, y: 150 },
            { target: Target.rightZone, x: -172, y: 0 },
            { target: Target.bottomRightZone, x: -86, y: -150 },
            { target: Target.bottomLeftZone, x: 86, y: -150 },
            { target: Target.leftZone, x: 172, y: 0 },
            { target: Target.centerZone, x: 0, y: 0 },
        ];
        const centerPoint = { x: groupWidth / 2, y: groupHeight / 2 };
        for (const item of zoneDrifts) {
            const { target, x, y } = item;
            this.highlights.set(target, new Highlight({
                isRectangle: false,
                coords: { position: centerPoint, offset: { x, y } },
            }));
        }

        const layouts = (() => {
            const length = 55;
            return [
                { target: Target.mapGroup, layout: { x: 0, y: 0, width: groupWidth, height: groupHeight } },
                { target: Target.movesCounter, layout: { x: 43, y: 70, width: length, height: length } },
                { target: Target.favorButton, layout: { x: 500, y: 67, width: length, height: length } },
                { target: Target.endTurnButton, layout: { x: 497, y: 367, width: length, height: length } },
                { target: Target.undoButton, layout: { x: 37, y : 375, width: length, height: length } },
            ];
        })();
        for (const item of layouts) {
            const { target, layout } = item;
            this.highlights.set(target, new Highlight({ isRectangle: true, layout }));
        }

        const nodes: Konva.Shape[] = [];
        this.highlights.forEach(highlight => {
            nodes.push(highlight.getElement());
        });
        this.group.add(...nodes);
    }

    public setPlacement(coordinates: Coordinates): void {
        this.group.x(coordinates.x).y(coordinates.y);
    }

    public update(targets: Array<Target>): void {
        this.highlights.forEach((highlight, key) => {
            if (targets.includes(key)) {
                highlight.isVisible() == false && highlight.show();
            } else {
                highlight.hide();
            }
        });
    }
}
