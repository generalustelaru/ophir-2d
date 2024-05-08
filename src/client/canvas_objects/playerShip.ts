import Konva from 'konva';
import { ActionEventPayload, PlayerShipInterface, Coordinates } from '../../shared_types';
import state from '../state';
import sharedConstants from '../../shared_constants';
import clientConstants from '../client_constants';

const { EVENT, ACTION } = sharedConstants;
const { COLOR } = clientConstants;
const HEX_COUNT = 7;

export class PlayerShip implements PlayerShipInterface {

    ship: Konva.Rect;
    label: Konva.Text;
    group: Konva.Group;

    public switchControl = (isActivePlayer: boolean) => {
        this.group.draggable(isActivePlayer);
    }

    public getElement = () => this.group;

    public setInfluence = (value: number) => {
        this.label.text(value.toString());
    }

    public setPosition = (coordinates: Coordinates) => {
        this.group.x(coordinates.x);
        this.group.y(coordinates.y);
    };

    constructor (
        stage: Konva.Stage,
        layer: Konva.Layer,
        offsetX: number,
        offsetY: number,
        fill: string
    ) {
        this.group = new Konva.Group({
            x: offsetX,
            y: offsetY,
            width: 40,
            height: 30,
            draggable: true,
            id: state.localPlayerId,
        });

        this.ship = new Konva.Rect({
            fill,
            stroke: COLOR.localShipBorder,
            strokeWidth: 3,
            width: 40,
            height: 30,
            cornerRadius: [0, 0, 5, 30],
        })

        this.group.on('dragstart', () => {
            state.konva.localShip.homePosition = { x: this.group.x(), y: this.group.y() }
        });

        this.group.on('dragmove', () => {

            const player = state.server.players[state.localPlayerId];
            const targetHex = state.konva.hexes.find(hex => hex.intersects(stage.getPointerPosition()));
            const shipState = state.konva.localShip;

            for (let i = 0; i < HEX_COUNT; i++) {
                state.konva.hexes[i].fill(COLOR.default);
            }

            shipState.isDestinationValid = false;

            if (!targetHex) {
                return;
            }

            if (targetHex.attrs.id === player.location.hexId) {
                targetHex.fill(player.isAnchored ? COLOR.anchored : COLOR.illegal);

            } else if (player.allowedMoves.includes(targetHex.attrs.id)) {
                targetHex.fill(COLOR.valid);
                shipState.isDestinationValid = true;

            } else {
                targetHex.fill(COLOR.illegal);
            }
        });

        this.group.on('dragend', () => {

            const targetHex = state.konva.hexes.find(hex => hex.intersects(stage.getPointerPosition()));
            const { x: positionX, y: positionY } = state.konva.localShip.homePosition;
            const player = state.server.players[state.localPlayerId];

            for (let i = 0; i < HEX_COUNT; i++) {
                state.konva.hexes[i].fill(COLOR.default);
            }

            if (state.konva.localShip.isDestinationValid) {
                targetHex.fill(COLOR.anchored);
                this.broadcastAction({
                    action: ACTION.move,
                    details: {
                        hexId: targetHex.attrs.id,
                        position: { x: this.group.x(), y: this.group.y() }
                    }
                });
            } else {
                this.group.x(positionX);
                this.group.y(positionY);
                const locationHex = state.konva.hexes.find(hex => hex.attrs.id === player.location.hexId);
                locationHex.fill(player.isAnchored ? COLOR.anchored : COLOR.illegal);
            }

            layer.batchDraw();
        });

        this.group.add(this.ship);

        this.label = new Konva.Text({
            x: 5,
            y: 5,
            text: '???',
            fontSize: 20,
            fill: 'white',
        });

        this.group.add(this.label);
    }

    private broadcastAction = (detail: ActionEventPayload = null) => {
        window.dispatchEvent(new CustomEvent(
            EVENT.action,
            { detail: detail }
        ));
    }
}