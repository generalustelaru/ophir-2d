import Konva from 'konva';
import { EventType, RawEvents, SailAttemptArgs } from '~/client_types';
import { Coordinates, ZoneName, PlayerColor, DiceSix, Action, Player, Rival, SpecialistName } from '~/shared_types';
import { ShipToken } from '../popular';
import { SeaZone } from '.';
import { Communicator } from '~/client/services/Communicator';
import { defineBobbing } from '~/client/animations';
import localState from '../../state';
import clientConstants from '~/client_constants';

const { PLAYER_HUES, SEA_ZONE_COUNT } = clientConstants;

export class PlayerShip extends Communicator {

    private ship: ShipToken;
    private group: Konva.Group;
    private initialPosition: Coordinates = { x: 0, y: 0 };
    private isDestinationValid: boolean = false;
    private seaZones: Array<SeaZone> = [];
    private players: Array<Player>;
    private rival: Rival;
    private toSailValue: DiceSix|false = false;
    private player: Player;
    private inControl: boolean = false;
    private activeEffect: Konva.Animation;
    private attemptSailing: (data: SailAttemptArgs) => void;

    public switchControl(isControllable: boolean) {
        this.inControl = isControllable;
    }

    public getElement() {
        return this.group;
    };

    public update(coordinates: Coordinates, players: Array<Player>, rival: Rival) {
        const player = players.find(p => p.color === localState.playerColor);

        if (!player)
            throw new Error('Cannot update player ship w/o participating color');

        if (coordinates.x != this.group.x() && coordinates.y != this.group.y()) {
            this.group.moveToTop();
        }

        this.players = players;
        this.player = player;
        this.rival = rival;
        this.group.x(coordinates.x);
        this.group.y(coordinates.y);
        this.group.draggable(player.isActive);
        this.inControl && player.moveActions ? this.activeEffect.start() : this.activeEffect.stop();
    };

    // MARK: -Constructor
    constructor(
        stage: Konva.Stage,
        offsetX: number,
        offsetY: number,
        seaZones: Array<SeaZone>,
        players: Array<Player>,
        rival: Rival,
        sailAttemptCallback: (data: SailAttemptArgs) => void,
    ) {
        super();
        this.attemptSailing = sailAttemptCallback;
        this.seaZones = seaZones;
        this.players = players;
        this.rival = rival;
        const playerColor = localState.playerColor;

        if (!playerColor) {
            throw new Error('Player data missing in local state!');
        }

        const player = players.find(p => p.color === playerColor);

        if (!player)
            throw new Error('Cannot update player ship w/o participating color');

        this.player = player;

        this.group = new Konva.Group({
            x: offsetX,
            y: offsetY,
            id: playerColor,
        });

        this.ship = new ShipToken(
            {
                combo: PLAYER_HUES[playerColor].vivid,
            },
        );

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

        // MARK: - Dragging (start)
        this.group.on(RawEvents.DRAG_START, () => {
            this.activeEffect.stop();
            this.group.moveToTop();
            this.initialPosition = { x: this.group.x(), y: this.group.y() };
        });

        // MARK: - Dragging (move)
        this.group.on(RawEvents.DRAG_MOVE, () => {
            this.isDestinationValid = false;
            this.toSailValue = false;
            const position = stage.getPointerPosition();
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!position || !targetZone) {
                return;
            }

            for (let i = 0; i < SEA_ZONE_COUNT; i++) {
                const seaZone = this.seaZones[i];
                seaZone.resetFill();
            }

            switch (true) {
                case targetZone.getZoneName() === this.player.bearings.seaZone:
                    break;
                case (
                    this.inControl
                    && this.player.moveActions
                    && this.player.destinations.includes(targetZone.getZoneName())
                ):
                    this.isDestinationValid = true;
                    this.toSailValue = this.calculateToSailValue(targetZone.getZoneName());

                    if (this.player.privilegedSailing || !this.toSailValue)
                        targetZone.setValid();
                    else
                        targetZone.setRollDependant(this.toSailValue);
                    break;
                case (
                    this.inControl
                    && this.player.moveActions
                    && this.player.navigatorAccess.includes(targetZone.getZoneName())
                ):
                    targetZone.setValidForNavigator();
                    this.isDestinationValid = true;
                    break;
                default:
                    targetZone.setRestricted();
            }
        });

        // MARK: - Dragging (end)
        this.group.on(RawEvents.DRAG_END, () => {

            for (let i = 0; i < SEA_ZONE_COUNT; i++)
                this.seaZones[i].resetFill();

            const player = this.player;

            if (!player)
                throw new Error('Cannot determine local player');

            const position = stage.getPointerPosition();
            const departureZone = this.seaZones.find(hex => hex.getZoneName() === player.bearings.seaZone);
            const targetZone = this.seaZones.find(hex => hex.isIntersecting(position));

            if (!departureZone)
                throw new Error('Missing departure hex data to compute repositioning/moving!');

            switch (true) {
                case targetZone && this.isDestinationValid:

                    if (this.toSailValue && !player.privilegedSailing) {
                        this.attemptSailing({
                            playerColor,
                            moveActions: player.moveActions,
                            origin: this.initialPosition,
                            destination: {
                                zoneId: targetZone.getZoneName(),
                                position: { x: this.group.x(), y: this.group.y() },
                            },
                            toSail: this.toSailValue,
                            isTempleGuard: player.specialist.name === SpecialistName.temple_guard,
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
                                    zoneId: targetZone.getZoneName(),
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
                    break;
                default:
                    this.group.x(this.initialPosition.x);
                    this.group.y(this.initialPosition.y);
                    departureZone.resetFill();
                    this.inControl && player.moveActions && this.activeEffect.start();
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