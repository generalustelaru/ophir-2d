import Konva from 'konva';
import { PlayerId, Coordinates, SharedState } from '../../shared_types';
import { InfoEventPayload, PlayerShipInterface } from '../client_types';
import { Service, ServiceInterface } from "./Service";
import { Ship } from '../canvas_objects/ship';
import { PlayerShip } from '../canvas_objects/playerShip';
import { MapHex } from '../canvas_objects/mapHex';
import { Barrier } from '../canvas_objects/barrier';
import { PlayMat } from '../canvas_objects/playMat';
import state from '../state';
import clientConstants from '../client_constants';

export interface MapBoardInterface extends ServiceInterface {
    drawBoard: () => void,
    updateBoard: () => void,
}

const { COLOR, HEX_OFFSET_DATA, ISLAND_DATA, SETTLEMENT_DATA, EVENT, SHIP_DATA } = clientConstants;

export class MapBoardService extends Service implements MapBoardInterface {
    stage: Konva.Stage;
    layer: Konva.Layer;
    center: Coordinates;

    constructor(stage: Konva.Stage, layer: Konva.Layer, center: Coordinates) {
        super();
        this.stage = stage;
        this.layer = layer;
        this.center = center;
    }

    drawBoard = () => {
        const serverState = state.server as SharedState;
        const players = serverState.players;
        const localPlayer = players[state.localPlayerId as PlayerId];
        const localPlayerHexColor = localPlayer?.isActive ? COLOR.illegal : COLOR.anchored;
        const settlements = serverState.setup.settlements
        //MARK: draw hexes
        HEX_OFFSET_DATA.forEach(hexItem => {
            const mapHex = new MapHex(
                this.center,
                hexItem.id,
                hexItem.x,
                hexItem.y,
                ISLAND_DATA[hexItem.id],
                SETTLEMENT_DATA[settlements[hexItem.id]],
                localPlayer?.location.hexId === hexItem.id
                    ? localPlayerHexColor
                    : COLOR.default
            );
            state.konva.hexes.push(mapHex);
            this.layer.add(mapHex.getElement());
        });

        // MARK: draw barriers
        const barriers = serverState.setup.barriers
        const barrier_1 = new Barrier(this.center, barriers[0]);
        const barrier_2 = new Barrier(this.center, barriers[1]);
        this.layer.add(barrier_1.getElement(), barrier_2.getElement());

        const drifts = SHIP_DATA.setupDrifts;
        //MARK: draw other ships
        const playerIds = Object.keys(players) as PlayerId[];
        playerIds.forEach((id) => {
            if (players[id] && id != state.localPlayerId) {

                const player = players[id];
                const shipPosition = this.getDrift(this.center, drifts.pop() as Coordinates);
                const ship = new Ship(
                    shipPosition.x,
                    shipPosition.y,
                    COLOR[id],
                    id
                );
                ship.setInfluence(player.influence);
                state.konva.opponentShips.push(ship);
                this.layer.add(ship.getElement());
            }
        });

        if (!state.localPlayerId) {
            const payload: InfoEventPayload = { text: 'You are a spectator' };
            this.broadcastEvent(EVENT.info, payload);

            return;
        }

        //MARK: draw local ship
        const shipPosition = this.getDrift(this.center, drifts.pop() as Coordinates);
        const playerShip = new PlayerShip(
            this.stage,
            this.layer,
            shipPosition.x,
            shipPosition.y,
            COLOR[state.localPlayerId],
        );
        playerShip.setInfluence(localPlayer.influence);
        playerShip.switchControl(localPlayer.isActive);

        this.layer.add(playerShip.getElement());
        state.konva.localShip.object = playerShip;

        // MARK: draw cargo hold
        const cargoHold = new PlayMat(this.matchCargoHoldColor(COLOR[state.localPlayerId]));
        this.layer.add(cargoHold.getElement());
        state.konva.localCargoHold = cargoHold;
    }

    updateBoard = () => {
        const serverState = state.server as SharedState;
        const players = serverState.players;
        const localPlayer = players[state.localPlayerId as PlayerId];
        const mapState = state.konva;
        //MARK: update hexes
        mapState.hexes.forEach(hex => {
            const hexId = hex.getId();
            let hexColor = COLOR.default;

            if (localPlayer?.location.hexId === hexId) {
                hexColor = localPlayer.isActive && !localPlayer.isAnchored
                    ? COLOR.illegal
                    : COLOR.anchored;
            }

            hex.setFill(hexColor);
        });
        // MARK: update other ships
        mapState.opponentShips.forEach(ship => {
            const opponentId: PlayerId = ship.getId();

            if (players[opponentId]) {
                const shipPosition = players[opponentId].location.position;
                ship.setPosition(shipPosition);
                ship.setInfluence(players[opponentId].influence);
                this.layer.batchDraw();
            } else {
                const payload: InfoEventPayload = {
                    text: `${opponentId} has left the game`
                };
                this.broadcastEvent(EVENT.info, payload);
                ship.destroy();
                // TODO: remove ship element from layer
                // TODO: implement a forfeit action to update the server state
            }
        });

        if (localPlayer) {
            const localShip = mapState.localShip.object as PlayerShip;
            localShip.switchControl(localPlayer.isActive && localPlayer.moveActions > 0);
            localShip.setPosition(localPlayer.location.position);
            localShip.setInfluence(localPlayer.influence);

            const localCargoHold = mapState.localCargoHold as PlayMat;
            localCargoHold.updateHold(localPlayer.cargo);
        }
    }

    private matchCargoHoldColor = (playerColor: string) => {
        switch (playerColor) {
            case COLOR.playerRed:
                return COLOR.holdDarkRed;
            case COLOR.playerPurple:
                return COLOR.holdDarkPurple;
            case COLOR.playerGreen:
                return COLOR.holdDarkGreen;
            case COLOR.playerYellow:
                return COLOR.holdDarkYellow;
            default:
                return COLOR.holdDarkRed;
        }
    }

    private getDrift = (center: Coordinates, drift: Coordinates): Coordinates => {
        return {
            x: center.x + drift.x,
            y: center.y + drift.y,
        }
    }
}
