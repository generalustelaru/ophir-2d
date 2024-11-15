import Konva from 'konva';
import constants from '../client_constants';
import { Player } from '../../shared_types';
import { DynamicGroupInterface } from '../client_types';

const { ICON_DATA, COLOR } = constants;

export class AnchorDial implements DynamicGroupInterface<Player> {
    private group: Konva.Group;
    private anchor: Konva.Path

    constructor(parent: Konva.Group, isActivePlayer: boolean) {
        this.group = new Konva.Group(
            {
                width: 50,
                height: 50,
                x: parent.width() - 100,
                y: parent.height() - 130,
            }
        );

        const hoverZone = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            hidden: true,
        });

        const data = isActivePlayer ? ICON_DATA.not_anchored : ICON_DATA.anchored;

        this.anchor = new Konva.Path({
            data: data.shape,
            fill: isActivePlayer ? data.fill : COLOR.disabled,
            scale: { x: 1.5, y: 1.5 },
        });

        this.group.add( hoverZone, this.anchor, );
    }

    public getElement() {
        return this.group;
    }

    public updateElement(player: Player): void {
            const data = player.isAnchored? ICON_DATA.anchored : ICON_DATA.not_anchored;
            this.anchor.data(data.shape);
            this.anchor.fill(player.isActive ? data.fill : COLOR.disabled);
    }
}
