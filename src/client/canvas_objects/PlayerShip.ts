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
    private homePosition: Coordinates = { x: 0, y: 0 };
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

        this.group.on('dragstart', () => {
            this.homePosition = { x: this.group.x(), y: this.group.y() }
        });

        this.group.on('dragmove', () => {
            const serverState = clientState.received as SharedState
            const player = serverState.players.find(player => player.id === playerId);

            if (!player) {
                throw new Error('Missing player data!');
            }

            const position = stage.getPointerPosition();

            if (!position) {
                throw new Error('Cannot determine position!');
            }

            const targetHex = this.mapHexes.find(
                hex => hex.isIntersecting(position)
            );

            const shipState = this;

            for (let i = 0; i < HEX_COUNT; i++) {
                this.mapHexes[i].setFill(COLOR.default);
            }

            shipState.isDestinationValid = false;

            if (!targetHex) {
                return;
            }

            if (targetHex.getId() === player.location.hexId) {
                targetHex.setFill(player.isAnchored ? COLOR.anchored : COLOR.illegal);

            } else if (player.moveActions && player.allowedMoves.includes(targetHex.getId())) {
                targetHex.setFill(COLOR.valid);
                this.isDestinationValid = true;

            } else {
                targetHex.setFill(COLOR.illegal);
            }
        });

        this.group.on('dragend', () => {
            const position = stage.getPointerPosition();

            if (!position) {
                throw new Error('Could not find pointer position!');
            }

            const targetHex = this.mapHexes.find(
                hex => hex.isIntersecting(position)
            );

            const { x: positionX, y: positionY } = this.homePosition;
            const serverState = clientState.received as SharedState
            const player = serverState.players.find(player => player.id === playerId);
            const locationHex = this.mapHexes.find(
                hex => hex.getId() === player?.location.hexId
            );

            if (!player || !locationHex) {
                throw new Error('Missing player data!');
            }

            for (let i = 0; i < HEX_COUNT; i++) {
                this.mapHexes[i].setFill(COLOR.default);
            }

            if (targetHex && this.isDestinationValid) {
                targetHex.setFill(COLOR.anchored);
                this.broadcastAction({
                    action: 'move',
                    details: {
                        hexId: targetHex.getId(),
                        position: { x: this.group.x(), y: this.group.y() }
                    }
                });
            } else {

                if (locationHex !== targetHex) {
                    this.group.x(positionX);
                    this.group.y(positionY);
                } else {
                    this.broadcastAction({
                        action: 'reposition',
                        details: {
                            repositioning: { x: this.group.x(), y: this.group.y() }
                        }
                    });
                }

                locationHex.setFill(player.isAnchored ? COLOR.anchored : COLOR.illegal);
            }
        });
        this.group.add(this.ship);

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