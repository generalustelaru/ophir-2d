import Konva from 'konva';
import constants from '../client_constants';

const { ICON_DATA } = constants;

export class AnchorDial {
    private group: Konva.Group;
    private anchor: Konva.Path

    constructor(isAnchored: boolean) {
        this.group = new Konva.Group();
        const data = isAnchored? ICON_DATA.anchored : ICON_DATA.not_anchored;
        this.anchor = new Konva.Path({
            x: 0,
            y: 0,
            data: data.shape,
            fill: data.fill,
            scale: { x: 1.5, y: 1.5 },
        });
        this.group.add(this.anchor);
    }

    public getElement() {
        return this.group;
    }

    public updateElements(isAnchored: boolean) {
        const data = isAnchored? ICON_DATA.anchored : ICON_DATA.not_anchored;
        this.anchor.data(data.shape);
        this.anchor.fill(data.fill);
    }
}