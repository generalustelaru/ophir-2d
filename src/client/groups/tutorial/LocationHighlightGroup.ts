import Konva from 'konva';
import { GroupHighlight } from './GroupHighlight';
import { GroupLayoutData, Target } from '~/client_types';
import { Highlight } from './Highlight';
export class LocationHighlightGroup extends GroupHighlight {
    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
        const highlights = new Map();
        const layouts = [
            { target: Target.locationGroup, layout: { x: 0, y: 0, width: 300, height: 500 } },

            { target: Target.marketArea, layout: { x: 2, y: 5, width: 293, height: 158 } },
            { target: Target.deck, layout: { x: 2, y: 5, width: 66, height: 160 } },
            { target: Target.slot_1, layout: { x: 75, y: 35, width: 66, height: 115 } },
            { target: Target.slot_2, layout: { x: 152, y: 35, width: 66, height: 115 } },
            { target: Target.slot_3, layout: { x: 227, y: 35, width: 66, height: 115 } },
            { target: Target.fluctuation_up, layout: { x: 249, y: 12, width: 23, height: 25 } },
            { target: Target.fluctuation_down, layout: { x: 97, y: 12, width: 23, height: 25 } },
            { target: Target.temple_mark, layout: { x: 169, y: 5, width: 32, height: 32 } },

            { target: Target.treasuryArea, layout: { x: 2, y: 165, width: 293, height: 100 } },
            { target: Target.goldForFavor, layout: { x: 2, y: 165, width: 66, height: 100 } },
            { target: Target.silverForFavor, layout: { x: 75, y: 165, width: 66, height: 100 } },
            { target: Target.goldForCoin, layout: { x: 152, y: 165, width: 66, height: 100 } },
            { target: Target.silverForCoin, layout: { x: 227, y: 165, width: 66, height: 100 } },

            { target: Target.templeArea, layout: { x: 2, y: 285, width: 293, height: 200 } },
            { target: Target.goldCard, layout: { x: 35, y: 285, width: 66, height: 100 } },
            { target: Target.silverCard, layout: { x: 111, y: 285, width: 66, height: 100 } },
            { target: Target.marketCard, layout: { x: 227, y: 285, width: 66, height: 130 } },
            { target: Target.upgradeButton, layout: { x: 207, y: 435, width: 86, height: 40 } },
            { target: Target.donationsDisplay, layout: { x: 25, y: 395, width: 162, height: 85 } },
        ];
        for (const item of layouts) {
            const { target, layout } = item;
            highlights.set(target, new Highlight({ isRectangle: true, layout }));
        }

        super(stage, layout, highlights);
    }
}