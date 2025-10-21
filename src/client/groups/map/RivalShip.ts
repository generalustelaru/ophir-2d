import Konva from 'konva';
import { Action, ClientMessage, Coordinates, PlayerColor, ShipBearings, ZoneName } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import { ShipToken } from '../popular';
import { SeaZone } from '.';
import clientConstants from '~/client_constants';

const { COLOR, SEA_ZONE_COUNT } = clientConstants;

export type RivalShipUpdate = {
    isControllable: boolean,
    bearings: ShipBearings,
    destinations: Array<ZoneName>,
    moves: number,
    activePlayerColor: PlayerColor,
}
export class RivalShip implements DynamicGroupInterface<RivalShipUpdate> {

    // private stage: Konva.Stage;
    private seaZones: Array<SeaZone>;
    private currentZone: ZoneName;
    private movesLeft: number;
    private ship: ShipToken;
    private initialPosition: Coordinates = { x: 0, y: 0 };
    private isDestinationValid: boolean = false;
    private group: Konva.Group;
    private localPlayerColor: PlayerColor | null;
    private destinations: Array<ZoneName>;

    constructor(
        stage: Konva.Stage,
        seaZones: Array<SeaZone>,
        data: RivalShipUpdate,
        localPlayerColor: PlayerColor | null,
    ) {
        // this.stage = stage;
        this.seaZones = seaZones;
        this.currentZone = data.bearings.seaZone;
        this.movesLeft = data.moves;
        this.localPlayerColor = localPlayerColor;
        this.destinations = data.destinations;

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

        this.group.on('dragstart', () => {
            this.initialPosition = { x: this.group.x(), y: this.group.y() };
        });

        // MARK: - MOVE
        this.group.on('dragmove', () => {
            this.isDestinationValid = false;
            const position = stage.getPointerPosition();
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!position || !targetZone)
                return;

            for (let i = 0; i < SEA_ZONE_COUNT; i++)
                this.seaZones[i].resetFill();

            switch (true) {
                case targetZone.getId() === this.currentZone:
                    break;
                case this.movesLeft && this.destinations.includes(targetZone.getId()):
                    this.isDestinationValid = true;
                    targetZone.setValid();
                    break;
                default:
                    targetZone.setRestricted();
            }
        });
        // MARK: - END
        this.group.on('dragend', () => {

            for (let i = 0; i < SEA_ZONE_COUNT; i++)
                this.seaZones[i].resetFill();

            const position = stage.getPointerPosition();
            const departureZone = this.seaZones.find(hex => hex.getId() === this.currentZone);
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!departureZone)
                throw new Error('Missing data for repositioning/moving!');

            switch (true) {
                case targetZone && this.isDestinationValid:
                    targetZone.setFill(COLOR.activeHex);
                    this.broadcastAction({
                        action: Action.move_rival,
                        payload: {
                            zoneId: targetZone.getId(),
                            position: { x: this.group.x(), y: this.group.y() },
                        },
                    });
                    break;
                case departureZone === targetZone:
                    this.broadcastAction({
                        action: Action.reposition_rival,
                        payload: {
                            repositioning: { x: this.group.x(), y: this.group.y() },
                        },
                    });
                    break;
                default:
                    this.group.x(this.initialPosition.x);
                    this.group.y(this.initialPosition.y);
                    departureZone.resetFill();
            }
        });

        this.group.add(this.ship.getElement());
        this.update(data);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(data: RivalShipUpdate): void {
        this.destinations = data.destinations;
        this.currentZone = data.bearings.seaZone;
        this.movesLeft = data.moves;
        this.group.x(data.bearings.position.x);
        this.group.y(data.bearings.position.y);
        this.group.draggable(data.isControllable && data.activePlayerColor === this.localPlayerColor);
        this.ship.update(data.isControllable ? COLOR[data.activePlayerColor] : COLOR.shipBorder);
    };

    private broadcastAction(detail: ClientMessage): void {
        window.dispatchEvent(new CustomEvent(
            'action',
            { detail: detail },
        ));
    }
}
