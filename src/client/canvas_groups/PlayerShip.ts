import Konva from 'konva';
import { Coordinates, PlayerId, SharedState } from '../../shared_types';
import { ActionEventPayload, PlayerShipInterface } from '../client_types';
import clientState from '../state';
import clientConstants from '../client_constants';
import { MapHex } from './MapHex';

const { COLOR, SHIP_DATA } = clientConstants;
const HEX_COUNT = 7;

export class PlayerShip implements PlayerShipInterface {

    private ship: Konva.Path;
    private influence: Konva.Text;
    private group: Konva.Group;
    private initialPosition: Coordinates = { x: 0, y: 0 };
    private isDestinationValid: boolean = false;
    private mapHexes: Array<MapHex> = [];

    public switchControl(isActivePlayer: boolean) {
        this.group.draggable(isActivePlayer);
    }

    public getElement() {
        return this.group
    };

    public setInfluence(value: number) {
        this.influence.text(value.toString());
    }

    public setPosition(coordinates: Coordinates) {
        this.group.x(coordinates.x);
        this.group.y(coordinates.y);
    };

    // MARK: - Constructor
    constructor(
        stage: Konva.Stage,
        offsetX: number,
        offsetY: number,
        fill: string,
        mapHexes: Array<MapHex>
    ) {
        this.mapHexes = mapHexes;
        const playerId = clientState.localPlayerId;

        if (!playerId) {
            throw new Error('Player ID is missing!');
        }

        this.group = new Konva.Group({
            x: offsetX,
            y: offsetY,
            draggable: true,
            id: playerId,
        });

        this.ship = new Konva.Path({
            x: -15,
            y: -5,
            data: SHIP_DATA.shape,
            fill,
            scale: { x: 1.5, y: 1.5 },
            stroke: COLOR.localShipBorder,
            strokeWidth: 2,
        });

        // MARK: - Dragging (start)
        this.group.on('dragstart', () => {
            this.initialPosition = { x: this.group.x(), y: this.group.y() }
        });

        // MARK: - Dragging (move)
        this.group.on('dragmove', () => {
            this.isDestinationValid = false;
            const serverState = clientState.received as SharedState
            const player = serverState.players.find(player => player.id === playerId);
            const position = stage.getPointerPosition();
            const targetHex = this.mapHexes.find(hex => hex.isIntersecting(position));

            if (!player || !position || !targetHex) {
                throw new Error('Missing state data to compute dragging!');
            }

            for (let i = 0; i < HEX_COUNT; i++) {
                const mapHex = this.mapHexes[i];
                mapHex.setRestricted(false);
                mapHex.setFill(player.location.hexId === mapHex.getId()
                    ? COLOR.locationHex
                    : COLOR.defaultHex
                );
            }

            switch (true) {
                case targetHex.getId() === player.location.hexId:
                    targetHex.setFill(COLOR.locationHex);
                    break;
                case player.moveActions && player.allowedMoves.includes(targetHex.getId()):
                    targetHex.setFill(COLOR.validHex);
                    this.isDestinationValid = true;
                    break;
                default:
                    targetHex.setRestricted(true);
                    targetHex.setFill(COLOR.illegal);
            }
        });

        // MARK: - Dragging (end)
        this.group.on('dragend', () => {

            for (let i = 0; i < HEX_COUNT; i++) {
                const mapHex = this.mapHexes[i];
                mapHex.setRestricted(false);
                mapHex.setFill(COLOR.defaultHex);
            }

            const player = clientState.received.players.find(player => player.id === playerId);
            const position = stage.getPointerPosition();
            const departureHex = this.mapHexes.find(hex => hex.getId() === player?.location.hexId);
            const targetHex = this.mapHexes.find(hex => hex.isIntersecting(position));

            if (!targetHex || !departureHex) {
                throw new Error('Missing state data compute repositioning/moving!');
            }

            switch (true) {
                case targetHex && this.isDestinationValid:
                    targetHex.setFill(COLOR.locationHex);
                    this.broadcastAction({
                        action: 'move',
                        details: {
                            hexId: targetHex.getId(),
                            position: { x: this.group.x(), y: this.group.y() }
                        }
                    });
                    break;
                case departureHex === targetHex:
                    this.broadcastAction({
                        action: 'reposition',
                        details: {
                            repositioning: { x: this.group.x(), y: this.group.y() }
                        }
                    });
                    departureHex.setFill(COLOR.locationHex);
                    break;
                default:
                    this.group.x(this.initialPosition.x);
                    this.group.y(this.initialPosition.y);
                    departureHex.setFill(COLOR.locationHex);
            }
        });
        this.group.add(this.ship);

        // MARK: - Influence text
        const lightColored: Array<PlayerId> = ['playerYellow', 'playerGreen'];
        const influenceTextColor = lightColored.includes(playerId) ? 'black' : 'white';
        this.influence = new Konva.Text({
            x: 6,
            y: 4,
            fontSize: 10,
            fontStyle: 'bold',
            fill: influenceTextColor,
        });
        this.group.add(this.influence);
    }

    private broadcastAction(detail: ActionEventPayload) {
        window.dispatchEvent(new CustomEvent(
            'action',
            { detail: detail }
        ));
    }
}