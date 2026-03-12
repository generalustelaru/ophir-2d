import Konva from 'konva';
import { GroupLayoutData, Target } from '~/client/client_types';
import { Highlight } from './Highlight';
import { GroupHighlight } from './GroupHighlight';

export class PlayerHighlightGroup extends GroupHighlight {

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
        const highlights = new Map<Target, Highlight>();
        const layouts = [
            { target: Target.playerGroup, layout: { x: -3, y: 15, width: 302, height: 222 } },

            { target: Target.playerPlacard, layout: { x: 0, y: 20, width: 300, height: 100 } },
            { target: Target.influenceDie, layout: { x: -5, y: 42, width: 55, height: 55 } },
            { target: Target.cargoBand, layout: { x: 55, y: 20, width: 108, height: 40 } },
            { target: Target.specialistBand, layout: { x: 165, y: 20, width: 130, height: 40 } },
            { target: Target.favorDial, layout: { x: 58, y: 60, width: 55, height: 55 } },
            { target: Target.coinDial, layout: { x: 108, y: 60, width: 55, height: 55 } },
            { target: Target.vpDial, layout: { x: 175, y: 60, width: 55, height: 55 } },
            { target: Target.specialtyButton, layout: { x: 237, y: 60, width: 55, height: 55 } },

            { target: Target.rivalPlacard, layout: { x: 0, y: 140, width: 300, height: 100 } },
            { target: Target.rivalInfluence, layout: { x: -5, y: 162, width: 55, height: 55 } },
            { target: Target.cycleMarket, layout: { x: 65, y: 140, width: 66, height: 100 } },
            { target: Target.concludeRival, layout: { x: 143, y: 155, width: 66, height: 66 } },
            { target: Target.rivalMoves, layout: { x: 143 + 66 + 5 + 3, y: 155, width: 66, height: 66 } },
        ];

        for (const item of layouts) {
            const { target, layout } = item;
            highlights.set(target, new Highlight({ isRectangle: true, layout }));
        }

        super(stage, layout, highlights);
    }
}