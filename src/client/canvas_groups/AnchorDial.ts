import Konva from 'konva';
import constants from '../client_constants';
import { Player } from '../../shared_types';

const { ICON_DATA, COLOR } = constants;

export class AnchorDial {
    private group: Konva.Group;
    private anchor: Konva.Path

    constructor(parent: Konva.Group, isActivePlayer: boolean) {
        this.group = new Konva.Group();
        const data = isActivePlayer ? ICON_DATA.not_anchored : ICON_DATA.anchored;
        this.anchor = new Konva.Path({
            x: parent.width() - 100,
            y: parent.height() - 130,
            data: data.shape,
            fill: isActivePlayer ? data.fill : COLOR.disabled,
            scale: { x: 1.5, y: 1.5 },
        });
        this.group.add(this.anchor);
    }

    public getElement() {
        return this.group;
    }

    public updateElements(player: Player) {
            const data = player.isAnchored? ICON_DATA.anchored : ICON_DATA.not_anchored;
            this.anchor.data(data.shape);
            this.anchor.fill(player.isActive ? data.fill : COLOR.disabled);
    }
}
