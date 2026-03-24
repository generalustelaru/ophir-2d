import Konva from 'konva';
import { Action, Coordinates, Player, PlayerColor, Unique } from '~/shared_types';
import { DynamicGroupInterface, EventType, RawEvents } from '~/client_types';
import { ShipToken } from '../popular';
import clientConstants from '~/client_constants';
import { SeaZone, DeedBubble } from '.';
import { slideToPosition } from '~/client/animations';
import { Communicator } from '~/client/services/Communicator';

const { PLAYER_HUES, SHIP_DATA } = clientConstants;
// TODO: Since all ships on the board now share similar logic, check and see if it can be shared/inherited
type RemoteShipUpdate = {
    remotePlayer: Player,
    isDraggable: boolean,
}
export class RemoteShip extends Communicator implements Unique<DynamicGroupInterface<RemoteShipUpdate>> {

    private group: Konva.Group;
    private ship: ShipToken;
    private deedBubble: DeedBubble;
    private localZone: SeaZone;
    private seaZones: Array<SeaZone>;
    private position: Coordinates = { x: 0, y: 0 };
    private isInspectable: boolean = true;

    constructor(
        stage: Konva.Stage,
        offsetX: number,
        offsetY: number,
        player: Player,
        seaZones: Array<SeaZone>,
    ) {
        super();
        this.group = new Konva.Group({
            x: offsetX,
            y: offsetY,
            width: SHIP_DATA.dimensions.width,
            height: SHIP_DATA.dimensions.height,
            id: player.color,
        });

        this.seaZones = seaZones;
        this.localZone = seaZones.find(
            z => z.getZoneName() == player.bearings.seaZone,
        )!;

        this.ship = new ShipToken(
            {
                combo: PLAYER_HUES[player.color].muted,
            },
        );

        this.deedBubble = new DeedBubble({ x: 0, y: -90 });

        this.group.on(RawEvents.HOVER, () => {
            stage.container().style.cursor = this.group.draggable() ? 'grab' : 'default';
        });

        this.group.on(RawEvents.CLICK, () => {
            this.isInspectable && this.deedBubble.peek();
        });

        this.group.on(RawEvents.LEAVE, () => {
            stage.container().style.cursor = 'default';
        });

        this.group.on(RawEvents.DRAG_START, () => {
            this.group.moveToTop();
            this.position = { x: this.group.x(), y: this.group.y() };
            this.isInspectable && this.deedBubble.peek(true);
        });

        this.group.on(RawEvents.DRAG_MOVE, () => {
            for (const seaZone of this.seaZones) {
                seaZone.resetFill();
            }

            const pointer = stage.getPointerPosition();
            const targetZone = this.seaZones.find(
                z => z.isIntersecting(pointer),
            );

            if (targetZone && targetZone != this.localZone)
                targetZone.setRestricted();
        });

        this.group.on(RawEvents.DRAG_END, () => {
            const pointer = stage.getPointerPosition();
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(pointer));

            if (targetZone != this.localZone) {
                this.group.x(this.position.x);
                this.group.y(this.position.y);
                targetZone && targetZone.resetFill();
            } else {
                this.position.x = this.group.x();
                this.position.y = this.group.y();
                this.createEvent({
                    type: EventType.action,
                    detail: {
                        action: Action.reposition_opponent,
                        payload: {
                            color: player.color,
                            position: { x: this.group.x(), y: this.group.y() },
                        },
                    },
                });
            }
        });

        this.group.add(
            this.ship.getElement(),
            this.deedBubble.getElement(),
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public getId(): PlayerColor {
        return this.group.attrs.id as PlayerColor;
    }

    public update(data: RemoteShipUpdate): void {
        const { remotePlayer, isDraggable } = data;
        const { seaZone, position: newPosition } = remotePlayer.bearings;

        if (remotePlayer.isCurrent) {
            this.group.moveToTop();
            this.isInspectable = false;
        } else {
            this.isInspectable = true;
        }

        this.localZone = this.seaZones.find(
            z => z.getZoneName() == seaZone,
        )!;

        if (newPosition.x != this.position.x || newPosition.y != this.position.y) {
            this.position = newPosition;
            this.group.moveToTop();
            slideToPosition(this.group, newPosition, 0.66);
        }

        if (this.position.y < 75)
            this.deedBubble.setVertical(-30, false);
        else
            this.deedBubble.setVertical(-90, true);

        this.deedBubble.update({
            isVisible: remotePlayer.isCurrent,
            deeds: remotePlayer.bubbleDeeds,
        });

        this.group.draggable(isDraggable);
    };

    public destroy(): void {
        this.group.destroy();
    }
}
