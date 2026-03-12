import Konva from 'konva';
import { GroupLayoutData, Target } from '~/client_types';
import { Highlight } from './Highlight';
import { GroupHighlight } from './GroupHighlight';

export class MapHighlightGroup extends GroupHighlight {

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
        const highlights = new Map<Target, Highlight>();
        const groupWidth = layout.width;
        const groupHeight = layout.height;

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
            highlights.set(target, new Highlight({
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
            highlights.set(target, new Highlight({ isRectangle: true, layout }));
        }

        super(stage, layout, highlights);
    }
}
