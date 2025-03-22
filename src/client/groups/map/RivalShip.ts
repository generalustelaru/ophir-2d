import Konva from 'konva';
import { Coordinates, PlayerColor, ShipBearings, ZoneName } from '../../../shared_types';
import { DynamicGroupInterface } from '../../client_types';
import clientConstants from '../../client_constants';
import { ShipToken } from './ShipToken';
import { SeaZone } from './SeaZoneTile';

const { COLOR } = clientConstants;

export type RivalShipUpdate = {
    isControllable: boolean,
    bearings: ShipBearings,
    destinations: Array<ZoneName>,
    activePlayerColor: PlayerColor,
}
export class RivalShip implements DynamicGroupInterface<RivalShipUpdate> {

    private stage: Konva.Stage;
    private seaZones: Array<SeaZone>;
    private ship: ShipToken;
    private initialPosition: Coordinates = { x: 0, y: 0 };
    private isDestinationValid: boolean = false;
    private group: Konva.Group;
    private localPlayerColor: PlayerColor | null;

    constructor(
        stage: Konva.Stage,
        seaZones: Array<SeaZone>,
        data: RivalShipUpdate,
        localPlayerColor: PlayerColor | null
    ) {
        this.stage = stage;
        this.seaZones = seaZones;
        this.localPlayerColor = localPlayerColor;

        this.group = new Konva.Group({
            x: data.bearings.position.x,
            y: data.bearings.position.y,
        });

        this.ship = new ShipToken(COLOR.boneWhite);

        this.group.on('mouseenter', () => {
            stage.container().style.cursor = 'grab';
        });

        this.group.on('mouseleave', () => {
            stage.container().style.cursor = 'default';
        });

        // MARK: - Dragging (start)
        this.group.on('dragstart', () => {
            this.initialPosition = { x: this.group.x(), y: this.group.y() }
        });

        this.group.on('dragmove', () => {
            this.isDestinationValid = false;
            const position = stage.getPointerPosition();
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!position || !targetZone)
                return;

            for (let i = 0; i < 7; i++) {
                const seaZone = this.seaZones[i];
                seaZone.setRestricted(false);
                seaZone.setToHitValue(false);
                seaZone.setFill(data.bearings.seaZone === seaZone.getId()
                    ? COLOR.activeHex
                    : COLOR.defaultHex
                );
            }

            switch (true) {
                case targetZone.getId() === data.bearings.seaZone:
                    targetZone.setFill(COLOR.activeHex);
                    break;
                case data.destinations.includes(targetZone.getId()):
                    targetZone.setFill(COLOR.validHex);
                    this.isDestinationValid = true;
                    break;
                default:
                    targetZone.setRestricted(true);
                    targetZone.setFill(COLOR.illegal);
            }
        })

        this.group.on('dragend', () => {

            console.log({ x: this.group.x(), y: this.group.y() })
        });

        this.group.add(this.ship.getElement());
        this.update(data);
    }

    public getElement(): Konva.Group {
        return this.group
    }

    public update(data: RivalShipUpdate): void {
        this.group.x(data.bearings.position.x);
        this.group.y(data.bearings.position.y);
        this.group.draggable(data.isControllable && data.activePlayerColor === this.localPlayerColor);
        this.ship.update(data.isControllable ? COLOR[data.activePlayerColor] : COLOR.shipBorder);
    };
}
