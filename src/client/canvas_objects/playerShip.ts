import Konva from 'konva';
import { Coordinates, PlayerId, PlayerState, SharedState } from '../../shared_types';
import { ActionEventPayload, MapHexInterface, PlayerShipInterface } from '../client_types';
import state from '../state';
import sharedConstants from '../../shared_constants';
import clientConstants from '../client_constants';
import { Vector2d } from 'konva/lib/types';

const { ACTION } = sharedConstants;
const { EVENT, COLOR, SHIP_DATA } = clientConstants;
const HEX_COUNT = 7;

export class PlayerShip implements PlayerShipInterface {

    ship: Konva.Path;
    influence: Konva.Text;
    group: Konva.Group;

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
        layer: Konva.Layer,
        offsetX: number,
        offsetY: number,
        fill: string
    ) {

        this.group = new Konva.Group({
            x: offsetX,
            y: offsetY,
            draggable: true,
            id: state.localPlayerId as PlayerId,
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
            state.konva.localShip.homePosition = { x: this.group.x(), y: this.group.y() }
        });

        this.group.on('dragmove', () => {

            const serverState = state.server as SharedState
            const player = serverState.players[state.localPlayerId as PlayerId];

            const targetHex = state.konva.hexes.find(
                hex => hex.isIntersecting(stage.getPointerPosition() as Vector2d)
            );

            const shipState = state.konva.localShip;

            for (let i = 0; i < HEX_COUNT; i++) {
                state.konva.hexes[i].setFill(COLOR.default);
            }

            shipState.isDestinationValid = false;

            if (!targetHex) {
                return;
            }

            if (targetHex.getId() === player.location.hexId) {
                targetHex.setFill(player.isAnchored ? COLOR.anchored : COLOR.illegal);

            } else if (player.allowedMoves.includes(targetHex.getId())) {
                targetHex.setFill(COLOR.valid);
                shipState.isDestinationValid = true;

            } else {
                targetHex.setFill(COLOR.illegal);
            }
        });

        this.group.on('dragend', () => {

            const targetHex = state.konva.hexes.find(
                hex => hex.isIntersecting(stage.getPointerPosition() as Vector2d)
            ) as MapHexInterface;

            const { x: positionX, y: positionY } = state.konva.localShip.homePosition;
            const serverState = state.server as SharedState
            const player = serverState.players[state.localPlayerId as PlayerId];

            for (let i = 0; i < HEX_COUNT; i++) {
                state.konva.hexes[i].setFill(COLOR.default);
            }

            if (state.konva.localShip.isDestinationValid) {
                targetHex.setFill(COLOR.anchored);
                this.broadcastAction({
                    action: ACTION.move,
                    details: {
                        hexId: targetHex.getId(),
                        position: { x: this.group.x(), y: this.group.y() }
                    }
                });
            } else {
                this.group.x(positionX);
                this.group.y(positionY);

                const locationHex = state.konva.hexes.find(
                    hex => hex.getId() === player.location.hexId
                ) as MapHexInterface;

                locationHex.setFill(player.isAnchored ? COLOR.anchored : COLOR.illegal);
            }

            layer.batchDraw();
        });

        this.group.add(this.ship);

        const influenceTextColor =
            state.localPlayerId === 'playerYellow'
                || state.localPlayerId === 'playerGreen'
                ? 'black'
                : 'white';

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
            EVENT.action,
            { detail: detail }
        ));
    }
}