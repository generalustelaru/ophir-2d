import Konva from 'konva';
import { GroupLayoutData } from '~/client_types';
import clientConstants from '~/client_constants';

const { HUES } = clientConstants;
export class Highlight {
    private highlight: Konva.Rect;

    constructor(layout: GroupLayoutData) {
        this.highlight = new Konva.Rect({
            ...layout,
            // cornerRadius: 15,
            stroke: HUES.vpCardLightPurple,
            strokeWidth: 5,
            listening: false,
            visible: false,
        });
    }

    public getElement() {
        return this.highlight;
    };

    public show() {
        this.highlight.visible(true);
    }

    public hide() {
        this.highlight.visible(false);
    }
}