import Konva from 'konva';
import { Player, Unique  } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import { Button } from '../popular';
import constants from '~/client_constants';

const { ICON_DATA, HUES } = constants;

export class EndTurnButton extends Button implements Unique<DynamicGroupInterface<Player>> {
    private anchor: Konva.Path;

    constructor(
        stage: Konva.Stage,
        parent: Konva.Group,
        callback: Function,
        isActivePlayer: boolean,
    ) {

        const layout = {
            width: 50,
            height: 50,
            x: parent.width() - 100,
            y: parent.height() - 130,
        };

        super(stage, layout, callback);

        const hoverZone = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            hidden: true,
        });

        const data = isActivePlayer ? ICON_DATA.not_anchored : ICON_DATA.anchored;

        this.anchor = new Konva.Path({
            data: data.shape,
            fill: isActivePlayer ? data.fill : HUES.disabled,
            scale: { x: 1.5, y: 1.5 },
        });

        this.group.add(hoverZone, this.anchor);
    }

    public getElement() {
        return this.group;
    }

    public update(player: Player): void {
        const icon = player.isAnchored && !player.isHandlingRival ? ICON_DATA.anchored : ICON_DATA.not_anchored;
        this.anchor.data(icon.shape);
        this.anchor.fill(player.isActive ? icon.fill : HUES.disabled);
        (player.isActive && player.isAnchored && !player.isHandlingRival) ? this.enable() : this.disable();
    }
}
