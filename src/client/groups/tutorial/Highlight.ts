import Konva from 'konva';
import { GroupLayoutData } from '~/client/client_types';
import clientConstants from '~/client_constants';
import { Coordinates } from '~/shared_types';

const { HUES } = clientConstants;
type SeaZoneData = {
    position: Coordinates,
    offset: Coordinates
}

type ShapeData = {
    isRectangle: true,
    layout: GroupLayoutData
} | {
    isRectangle: false,
    coords: SeaZoneData
}
export class Highlight {
    private highlight: Konva.Shape;

    constructor(data: ShapeData) {
        const props = {
            stroke: HUES.vpCardLightPurple,
            strokeWidth: 5,
            listening: false,
            visible: false,
        };

        this.highlight = data.isRectangle
            ? new Konva.Rect({ ...data.layout,...props })
            : new Konva.RegularPolygon({
                ...data.coords.position,
                offset: data.coords.offset,
                radius: 100,
                sides: 6,
                ...props,
            });
    }

    public getElement() {
        return this.highlight;
    };

    public isVisible() {
        return this.highlight.visible();
    }

    public show() {
        this.highlight.visible(true);
        this.tweenToColor(HUES.vpCardLightPurple, 'white');
    }

    public hide() {
        this.highlight.visible(false);
    }

    private tweenToColor(fromColor: string, toColor: string) {
        const tween = new Konva.Tween({
            node: this.highlight,
            duration: .33,           // seconds
            stroke: toColor,
            easing: Konva.Easings.EaseInOut,
            onFinish: () => {
                tween.destroy();
                if(this.highlight.visible())
                    this.tweenToColor(toColor, fromColor); // flip and repeat
            },
        });

        tween.play();
    }

}