import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '../../client_types';
import { ActionButton } from '../ActionButton';
import { Player, WsPayload } from '../../../shared_types';
import { FavorIcon } from '../FavorIcon';
import clientConstants from '../../client_constants';

const { COLOR_PROFILES, ICON_DATA } = clientConstants;

export class FavorButton extends ActionButton implements DynamicGroupInterface<Player> {

    private favorIcon: FavorIcon;
    private checkmark: Konva.Path;
    constructor(
        stage: Konva.Stage,
        actionPayload: WsPayload | null,
        player: Player | null,
        layout: GroupLayoutData,
    ) {
        super(stage, layout, actionPayload);

        this.favorIcon = new FavorIcon({ x: 0, y: 0, width: layout.width, height: layout.height });

        this.checkmark = new Konva.Path({
            data: ICON_DATA.active_favor_check.shape,
            fill: ICON_DATA.active_favor_check.fill,
            scale: { x: 2, y: 2 },
        });

        this.group.add(this.favorIcon.getElement(), this.checkmark);

        this.update(player);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(player: Player | null): void {
        switch (true) {
            case (player?.isActive && player.privilegedSailing):
                this.setEnabled(false);
                this.favorIcon.update(COLOR_PROFILES.favorStampActive);
                this.checkmark.visible(true);

                break;

            case (player?.isActive && player.favor > 0 && player.moveActions > 0):
                this.setEnabled(true);
                this.checkmark.visible(false);
                this.favorIcon.update(COLOR_PROFILES.favorStampReady);

                break;

            default:
                this.setEnabled(false);
                this.favorIcon.update(COLOR_PROFILES.favorStampDisabled);
                this.checkmark.visible(false);

                break;
        }
    }
}