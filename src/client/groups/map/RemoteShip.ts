import Konva from 'konva';
import { Action, ClientMessage, Coordinates, Player, PlayerColor, Unique } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import { ShipToken } from '../popular';
import clientConstants from '~/client_constants';
import { SeaZone } from './SeaZone';

const { COLOR, SHIP_DATA } = clientConstants;
// TODO: Since all ships on the board now share similar logic, check and see if it can be shared/inherited
type RemoteShipUpdate = {
    remotePlayer: Player,
    isDraggable: boolean,
}
export class RemoteShip implements Unique<DynamicGroupInterface<RemoteShipUpdate>> {

    private ship: ShipToken;
    private localZone: SeaZone;
    private seaZones: Array<SeaZone>;
    private position: Coordinates = { x: 0, y: 0 };
    private group: Konva.Group;

    constructor(
        stage: Konva.Stage,
        offsetX: number,
        offsetY: number,
        player: Player,
        seaZones: Array<SeaZone>,
    ) {
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
            player.color,
            { stroke: player.isActive ? COLOR.activeShipBorder : COLOR.shipBorder },
        );

        this.group.on('mouseenter', () => {
            stage.container().style.cursor = this.group.draggable() ? 'grab' : 'default';
        });

        this.group.on('mouseleave', () => {
            stage.container().style.cursor = 'default';
        });

        this.group.on('dragstart', () => {
            this.group.moveToTop();
            this.position = { x: this.group.x(), y: this.group.y() };
        });

        this.group.on('dragmove', () => {
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

        this.group.on('dragend', () => {
            const pointer = stage.getPointerPosition();
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(pointer));

            if (targetZone != this.localZone) {
                this.group.x(this.position.x);
                this.group.y(this.position.y);
                targetZone && targetZone.resetFill();
            } else {
                this.broadcastAction({
                    action: Action.reposition_opponent,
                    payload: {
                        color: player.color,
                        repositioning: { x: this.group.x(), y: this.group.y() },
                    },
                });
            }
        });

        this.group.add(this.ship.getElement());
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public getId(): PlayerColor {
        return this.group.attrs.id as PlayerColor;
    }

    public update(data: RemoteShipUpdate): void {
        const { remotePlayer, isDraggable } = data;
        const { seaZone, position: positionUpdate } = remotePlayer.bearings;
        this.localZone = this.seaZones.find(
            z => z.getZoneName() == seaZone,
        )!;

        if (positionUpdate.x != this.position.x && positionUpdate.y != this.position.y) {
            this.position = positionUpdate;
            this.group.moveToTop();
        }

        this.group.x(positionUpdate.x);
        this.group.y(positionUpdate.y);
        this.ship.update(remotePlayer.isActive ? COLOR.activeShipBorder : COLOR.shipBorder);
        this.group.draggable(isDraggable);
    };

    public destroy(): void {
        this.group.destroy();
    }

    private broadcastAction(detail: ClientMessage): void {
        window.dispatchEvent(new CustomEvent(
            'action',
            { detail: detail },
        ));
    }
}