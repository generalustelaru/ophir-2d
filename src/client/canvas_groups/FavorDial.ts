import Konva from 'konva';
import clientConstants from '../client_constants';
import { ActionEventPayload, DynamicGroupInterface, GroupLayoutData } from '../client_types';
import { ResponsiveGroup } from './ResponsiveGroup';
import { Player, PlayerId } from '../../shared_types';

const { ICON_DATA, COLOR } = clientConstants;
export class FavorDial extends ResponsiveGroup implements DynamicGroupInterface<Player> {
    private favor: Konva.Text;
    private localPlayerId: PlayerId | null;

    constructor(
        stage: Konva.Stage,
        actionPayload: ActionEventPayload | null,
        player: Player,
        localPlayerId: PlayerId | null,
        layout: GroupLayoutData,
    ) {
        super(
            stage,
            layout,
            actionPayload
        );

        const outerStamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_outer.shape,
            fill: ICON_DATA.favor_stamp_outer.fill,
            stroke: COLOR.stampEdge,
            strokeWidth: 2,
            scale: { x: 2, y: 2 },
        });

        const innerStamp = new Konva.Path({
            data: ICON_DATA.favor_stamp_inner.shape,
            fill: ICON_DATA.favor_stamp_inner.fill,
            stroke: COLOR.stampEdge,
            strokeWidth: 1,
            scale: { x: 2, y: 2 },
        });

        const stampCenter = outerStamp.getClientRect().width / 2;
        this.favor = new Konva.Text({
            x: stampCenter - 7,
            y: stampCenter - 12,
            text: player.favor.toString(),
            fontSize: 20,
            fill: COLOR.boneWhite,
            fontFamily: 'Arial',
        });

        this.group.add(outerStamp, innerStamp, this.favor);

        this.setEnabled(player.id === localPlayerId && player.isActive && player.favor > 0);
        this.localPlayerId = localPlayerId;
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(player: Player): void {
        this.setEnabled((
            player.id === this.localPlayerId
            && player.isActive
            && player.favor > 0
            && !player.hasSpentFavor
            && player.moveActions > 0
        ));

        this.favor.text(player.favor.toString());
    }
}