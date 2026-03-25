import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { Player, ClientMessage, Unique } from '~/shared_types';
import { RequestButton, FavorIcon } from '../popular';
import clientConstants from '~/client_constants';

const { COLOR_PROFILES, ICON_DATA } = clientConstants;

export class FavorButton extends RequestButton implements Unique<DynamicGroupInterface<Player>> {

    private favorIcon: FavorIcon;
    private checkmark: Konva.Path;
    constructor(
        stage: Konva.Stage,
        message: ClientMessage | null,
        layout: GroupLayoutData,
    ) {
        super(stage, layout, message);

        this.favorIcon = new FavorIcon({ x: 0, y: 0 });

        this.checkmark = new Konva.Path({
            data: ICON_DATA.active_favor_check.shape,
            fill: ICON_DATA.active_favor_check.fill,
            scale: { x: 2, y: 2 },
        });

        this.group.add(this.favorIcon.getElement(), this.checkmark);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(player: Player | null): void {
        switch (true) {
            case (player?.isHandlingRival):
                super.setEnabled(false);
                break;

            case (player?.isCurrent && player.privilegedSailing):
                super.setEnabled(false);
                this.favorIcon.update(COLOR_PROFILES.favorStampActive);
                this.checkmark.visible(true);
                break;

            case (player?.isCurrent && player.favor > 0 && player.moveActions > 0):
                super.setEnabled(true);
                this.favorIcon.update(COLOR_PROFILES.favorStampReady);
                this.checkmark.visible(false);
                break;

            default:
                super.setEnabled(false);
                this.favorIcon.update(COLOR_PROFILES.favorStampDisabled);
                this.checkmark.visible(false);
                break;
        }
    }

    public disable() {
        super.setEnabled(false);
        this.favorIcon.update(COLOR_PROFILES.favorStampDisabled);
        this.checkmark.visible(false);
    }
}