import Konva from 'konva';
import { Color, EventType } from '~/client_types';
import { Coordinates, ZoneName, PlayerColor, DiceSix, Action, Player, Rival, SpecialistName } from '~/shared_types';
import { ShipToken } from '../popular';
import { SeaZone } from '.';
import { Communicator } from '~/client/services/Communicator';
import localState from '../../state';
import clientConstants from '~/client_constants';

const { COLOR, SEA_ZONE_COUNT } = clientConstants;

export class PlayerShip extends Communicator {

    private ship: ShipToken;
    private group: Konva.Group;
    private initialPosition: Coordinates = { x: 0, y: 0 };
    private isDestinationValid: boolean = false;
    private seaZones: Array<SeaZone> = [];
    private players: Array<Player>;
    private rival: Rival;
    private toSailValue: DiceSix|false = false;

    public switchControl(isDraggable: boolean) {
        this.group.draggable(isDraggable);
    }

    public getElement() {
        return this.group;
    };

    public update(coordinates: Coordinates, players: Array<Player>, rival: Rival) {
        this.players = players;
        this.rival = rival;
        this.group.x(coordinates.x);
        this.group.y(coordinates.y);
    };

    // MARK: - Constructor
    constructor(
        stage: Konva.Stage,
        offsetX: number,
        offsetY: number,
        fill: Color,
        isActivePlayer: boolean,
        seaZones: Array<SeaZone>,
        players: Array<Player>,
        rival: Rival,
    ) {
        super();

        this.seaZones = seaZones;
        this.players = players;
        this.rival = rival;
        const playerColor = localState.playerColor;

        if (!playerColor) {
            throw new Error('Cannot create PlayerShip w/o Player ID!');
        }

        this.group = new Konva.Group({
            x: offsetX,
            y: offsetY,
            draggable: true,
            id: playerColor,
        });

        this.ship = new ShipToken(
            fill,
            { stroke: isActivePlayer && COLOR.activeShipBorder || COLOR.shipBorder },
        );

        this.group.on('mouseenter', () => {
            stage.container().style.cursor = 'grab';
        });

        this.group.on('mouseleave', () => {
            stage.container().style.cursor = 'default';
        });

        // MARK: - Dragging (start)
        this.group.on('dragstart', () => {
            this.initialPosition = { x: this.group.x(), y: this.group.y() };
        });

        // MARK: - Dragging (move)
        this.group.on('dragmove', () => {
            this.isDestinationValid = false;
            this.toSailValue = false;
            const player = this.players.find(player => player.color === playerColor);
            const position = stage.getPointerPosition();
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!player || !position || !targetZone) {
                return;
            }

            for (let i = 0; i < SEA_ZONE_COUNT; i++) {
                const seaZone = this.seaZones[i];
                seaZone.setRestricted(false);
                seaZone.setToHitValue(false);
                seaZone.setFill(player.bearings.seaZone === seaZone.getId() && player.locationActions
                    ? COLOR.activeHex
                    : COLOR.defaultHex,
                );
            }

            switch (true) {
                case targetZone.getId() === player.bearings.seaZone:
                    targetZone.setFill(player.locationActions.length ? COLOR.activeHex : COLOR.defaultHex);
                    break;
                case player.moveActions && player.destinations.includes(targetZone.getId()):
                    targetZone.setFill(COLOR.validHex);
                    this.isDestinationValid = true;
                    this.toSailValue = this.calculateToSailValue(targetZone.getId());
                    targetZone.setToHitValue(player.privilegedSailing ? false : this.toSailValue );
                    break;
                case player.moveActions && player.navigatorAccess.includes(targetZone.getId()):
                    targetZone.setFill(COLOR.navigatorAccess);
                    this.isDestinationValid = true;
                    targetZone.setToHitValue(false);
                    break;
                default:
                    targetZone.setRestricted(true);
                    targetZone.setFill(COLOR.illegal);
            }
        });

        // MARK: - Dragging (end)
        this.group.on('dragend', () => {

            for (let i = 0; i < SEA_ZONE_COUNT; i++) {
                const seaZone = this.seaZones[i];
                seaZone.setRestricted(false);
                seaZone.setToHitValue(false);
                seaZone.setFill(COLOR.defaultHex);
            }

            const player = this.players.find(player => player.color === playerColor);

            if (!player)
                throw new Error('Cannot determine local player');

            const position = stage.getPointerPosition();
            const departureZone = this.seaZones.find(hex => hex.getId() === player.bearings.seaZone);
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!departureZone) {
                throw new Error('Missing departure hex data to compute repositioning/moving!');
            }

            switch (true) {
                case targetZone && this.isDestinationValid:
                    targetZone.setFill(COLOR.activeHex);

                    if (this.toSailValue && !player.privilegedSailing) {
                        this.createEvent({
                            type: EventType.sail_attempt,
                            detail: {
                                playerColor,
                                moveActions: player.moveActions,
                                origin: this.initialPosition,
                                destination: {
                                    zoneId: targetZone.getId(),
                                    position: { x: this.group.x(), y: this.group.y() },
                                },
                                toSail: this.toSailValue,
                                isTempleGuard: player.specialist.name === SpecialistName.temple_guard,
                            },
                        });
                        // TODO: Make coords-reset actionable from modal (when canceling attempt)
                        this.group.x(this.initialPosition.x);
                        this.group.y(this.initialPosition.y);
                    } else {
                        this.createEvent({
                            type: EventType.action,
                            detail: {
                                action: Action.move,
                                payload: {
                                    zoneId: targetZone.getId(),
                                    position: { x: this.group.x(), y: this.group.y() },
                                },
                            },
                        });
                    }

                    break;
                case departureZone === targetZone:
                    this.createEvent({
                        type: EventType.action,
                        detail: {
                            action: Action.reposition,
                            payload: {
                                repositioning: { x: this.group.x(), y: this.group.y() },
                            },
                        },
                    });
                    departureZone.setFill(player?.locationActions.length ? COLOR.activeHex : COLOR.defaultHex);
                    break;
                default:
                    this.group.x(this.initialPosition.x);
                    this.group.y(this.initialPosition.y);
                    departureZone.setFill(player?.locationActions.length ? COLOR.activeHex: COLOR.defaultHex);
            }
        });
        this.group.add(this.ship.getElement());
    }

    public getId(): PlayerColor {
        return this.group.attrs.id() as PlayerColor;
    }

    public destroy(): void {
        this.group.destroy();
    }

    public switchHighlight(isHighlighted: boolean): void {
        this.ship.update(isHighlighted ? COLOR.activeShipBorder : COLOR.shipBorder);
    }

    private calculateToSailValue(targetHexId: ZoneName): DiceSix | false {
        const rival = this.rival.isIncluded ? this.rival : null;
        const rivalInfluence = rival && rival.bearings.seaZone === targetHexId ? rival.influence : 0;

        const influencePool = this.players
            .map(player => {
                return player.bearings.seaZone === targetHexId ? player.influence : 0;
            });

        const highestInfluence = Math.max(...influencePool, rivalInfluence) as DiceSix;

        return highestInfluence > 0 ? highestInfluence : false;
    }
}