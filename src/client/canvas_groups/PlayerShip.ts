import Konva from 'konva';
import { Coordinates, HexId, PlayerId, SharedState, DiceSix } from '../../shared_types';
import { ActionEventPayload } from '../client_types';
import clientState from '../state';
import clientConstants from '../client_constants';
import { MapHex } from './CanvasGroups';

const { COLOR, SHIP_DATA } = clientConstants;
const HEX_COUNT = 7;

export class PlayerShip {

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

    public updateElement(coordinates: Coordinates) {
        this.group.x(coordinates.x);
        this.group.y(coordinates.y);
    };

    // MARK: - Constructor
    constructor(
        stage: Konva.Stage,
        offsetX: number,
        offsetY: number,
        fill: string,
        isActivePlayer: boolean,
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
            stroke: isActivePlayer ? COLOR.activeShipBorder : COLOR.shipBorder,
            strokeWidth: 2,
        });

        this.group.on('mouseenter', () => {
            stage.container().style.cursor = 'pointer';
        });

        this.group.on('mouseleave', () => {
            stage.container().style.cursor = 'default';
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
                return;
            }

            for (let i = 0; i < HEX_COUNT; i++) {
                const mapHex = this.mapHexes[i];
                mapHex.setRestricted(false);
                mapHex.setBoneIcon(false);
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
                    targetHex.setBoneIcon(player.hasSpentFavor ? false : this.calculateToSailValue(targetHex.getId()));
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
                mapHex.setBoneIcon(false);
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
        const lightColored: Array<PlayerId> = ['playerYellow', 'playerRed'];
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

    public getId(): PlayerId {
        return this.group.attrs.id() as PlayerId;
    }

    public destroy(): void {
        this.group.destroy()
    }

    public switchHighlight(isHighlighted: boolean): void {
        this.ship.stroke(isHighlighted ? COLOR.activeShipBorder : COLOR.shipBorder);
    }

    private broadcastAction(detail: ActionEventPayload): void {
        window.dispatchEvent(new CustomEvent(
            'action',
            { detail: detail }
        ));
    }
    private calculateToSailValue(targetHexId: HexId): DiceSix | false {
        const influencePool = clientState.received.players
            .map(player => { return player.location.hexId === targetHexId ? player.influence : 0 });
        const highestInfluence = Math.max(...influencePool) as DiceSix;

        return highestInfluence > 0 ? highestInfluence : false;
    }
}