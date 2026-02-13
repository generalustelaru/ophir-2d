import Konva from 'konva';
import { Action, ClientMessage, Coordinates, PlayerColor, ShipBearings, Unique, ZoneName } from '~/shared_types';
import { DynamicGroupInterface, RawEvents } from '~/client_types';
import { ShipToken } from '../popular';
import { SeaZone } from '.';
import { defineBobbing } from '~/client/animations';
import clientConstants from '~/client_constants';

const { HUES, SEA_ZONE_COUNT } = clientConstants;

export type RivalShipUpdate = {
    isControllable: boolean,
    isDraggable: boolean,
    bearings: ShipBearings,
    destinations: Array<ZoneName>,
    moves: number,
    activePlayerColor: PlayerColor,
}
export class RivalShip implements Unique<DynamicGroupInterface<RivalShipUpdate>> {

    // private stage: Konva.Stage;
    private seaZones: Array<SeaZone>;
    private currentZone: ZoneName;
    private movesLeft: number;
    private ship: ShipToken;
    private initialPosition: Coordinates = { x: 0, y: 0 };
    private isDestinationValid: boolean = false;
    private group: Konva.Group;
    private destinations: Array<ZoneName>;
    private isControllable: boolean = false;
    private activeEffect: Konva.Animation;

    constructor(
        stage: Konva.Stage,
        seaZones: Array<SeaZone>,
        data: RivalShipUpdate,
    ) {
        this.seaZones = seaZones;
        this.currentZone = data.bearings.seaZone;
        this.movesLeft = data.moves;
        this.destinations = data.destinations;

        this.group = new Konva.Group({
            x: data.bearings.position.x,
            y: data.bearings.position.y,
        });

        this.ship = new ShipToken({ combo: { light: HUES.Neutral, dark: HUES.darkNeutral, accent: HUES.shipBorder } });

        this.activeEffect = defineBobbing(
            this.ship.getElement(),
            {
                pixelAmplitude: 5,
                periodSeconds: 2,
            },
        );

        this.group.on(RawEvents.HOVER, () => {
            stage.container().style.cursor = this.group.draggable() ? 'grab' : 'default';
        });

        this.group.on(RawEvents.LEAVE, () => {
            stage.container().style.cursor = 'default';
        });

        this.group.on(RawEvents.DRAG_START, () => {
            this.activeEffect.stop();
            this.group.moveToTop();
            this.initialPosition = { x: this.group.x(), y: this.group.y() };
        });

        // MARK: - MOVE
        this.group.on(RawEvents.DRAG_MOVE, () => {
            this.isDestinationValid = false;
            const position = stage.getPointerPosition();
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!position || !targetZone)
                return;

            for (let i = 0; i < SEA_ZONE_COUNT; i++)
                this.seaZones[i].resetFill();

            switch (true) {
                case targetZone.getZoneName() === this.currentZone:
                    break;
                case this.isControllable && this.movesLeft && this.destinations.includes(targetZone.getZoneName()):
                    this.isDestinationValid = true;
                    targetZone.setValid();
                    break;
                default:
                    targetZone.setRestricted();
            }
        });
        // MARK: - END
        this.group.on(RawEvents.DRAG_END, () => {

            for (let i = 0; i < SEA_ZONE_COUNT; i++)
                this.seaZones[i].resetFill();

            const position = stage.getPointerPosition();
            const departureZone = this.seaZones.find(hex => hex.getZoneName() === this.currentZone);
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!departureZone)
                throw new Error('Missing data for repositioning/moving!');

            switch (true) {
                case targetZone && this.isDestinationValid:
                    targetZone.setFill(HUES.activeHex);
                    this.broadcastAction({
                        action: Action.move_rival,
                        payload: {
                            zoneId: targetZone.getZoneName(),
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

            this.isControllable && this.movesLeft && this.activeEffect.start();
        });

        this.group.add(this.ship.getElement());
        this.update(data);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    // MARK: UPDATE
    public update(data: RivalShipUpdate): void {
        const  { moves, bearings, isControllable, isDraggable, destinations } = data;
        this.isControllable = isControllable;
        this.destinations = destinations;
        this.currentZone = bearings.seaZone;
        this.movesLeft = moves;
        this.group.x(bearings.position.x);
        this.group.y(bearings.position.y);
        this.group.draggable(isDraggable);
        isControllable && moves ? this.activeEffect.start() : this.activeEffect.stop();
    };

    private broadcastAction(detail: ClientMessage): void {
        window.dispatchEvent(new CustomEvent(
            'action',
            { detail: detail },
        ));
    }
}
