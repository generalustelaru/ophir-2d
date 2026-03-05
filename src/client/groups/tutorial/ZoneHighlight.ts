import Konva from 'konva';
import { Coordinates } from '~/shared_types';
import clientConstants from '~/client_constants';

const { HUES } = clientConstants;
export class ZoneHighlight {
    private highlight: Konva.RegularPolygon;

    constructor(position: Coordinates, offset: Coordinates) {
        this.highlight = new Konva.RegularPolygon({
            ...position,
            offset,
            radius: 100,
            sides: 6,
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