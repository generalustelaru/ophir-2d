import Konva from 'konva';
import { ActionEventPayload, DynamicGroupInterface, GroupLayoutData } from '../client_types';
import { ActionGroup } from './ActionGroup';
import { Player } from '../../shared_types';
import { FavorDial } from './FavorDial';

export class FavorButton extends ActionGroup implements DynamicGroupInterface<Player> {

    private favorDial: FavorDial;

    constructor(
        stage: Konva.Stage,
        actionPayload: ActionEventPayload | null,
        isActivePlayer: boolean,
        activePlayerHasInfluence: boolean,
        layout: GroupLayoutData,
    ) {
        super(stage, layout, actionPayload);

        this.favorDial = new FavorDial(
            null,
            layout,
        );

        this.group.add(this.favorDial.getElement());

        this.setEnabled(isActivePlayer && activePlayerHasInfluence);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(player: Player): void {
        this.setEnabled((
            player.isActive
            && player.favor > 0
            && !player.hasSpentFavor
            && player.moveActions > 0
        ));

        this.favorDial.updateElement(player.favor);
    }
}