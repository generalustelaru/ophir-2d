import Konva from 'konva';
import { PlayerId, Coordinates, SharedState } from '../../shared_types';
import { CanvasSegmentInterface, InfoEventPayload, } from '../client_types';
import { Service } from "./Service";
import { Ship } from '../canvas_objects/Ship';
import { PlayerShip } from '../canvas_objects/PlayerShip';
import { MapHex } from '../canvas_objects/MapHex';
import { Barrier } from '../canvas_objects/Barrier';
import clientState from '../state';
import clientConstants from '../client_constants';

const { COLOR, HEX_OFFSET_DATA, ISLAND_DATA, SETTLEMENT_DATA, EVENT } = clientConstants;

export class MapSegmentPainter extends Service implements CanvasSegmentInterface {
    private stage: Konva.Stage;
    private layer: Konva.Layer;
    private centerPoint: Coordinates;

    constructor(stage: Konva.Stage, center: Coordinates) {
        super();
        this.stage = stage;
        this.layer = stage.getLayers()[0];
        this.centerPoint = center;
    }

    public drawElements(): void {
        const serverState = clientState.sharedState as SharedState;
        const players = serverState.players;
        const localPlayer = players[clientState.localPlayerId as PlayerId];
        const localPlayerHexColor = localPlayer?.isActive ? COLOR.illegal : COLOR.anchored;
        const settlements = serverState.setup.settlements
        //MARK: draw hexes
        HEX_OFFSET_DATA.forEach(hexItem => {
            const mapHex = new MapHex(
                this.centerPoint,
                hexItem.id,
                hexItem.x,
                hexItem.y,
                ISLAND_DATA[hexItem.id],
                SETTLEMENT_DATA[settlements[hexItem.id]],
                localPlayer?.location.hexId === hexItem.id
                    ? localPlayerHexColor
                    : COLOR.default
            );
            clientState.konva.hexes.push(mapHex);
            this.layer.add(mapHex.getElement());
        });

        // MARK: draw barriers
        const barriers = serverState.setup.barriers
        const barrier_1 = new Barrier(this.centerPoint, barriers[0]);
        const barrier_2 = new Barrier(this.centerPoint, barriers[1]);
        this.layer.add(barrier_1.getElement(), barrier_2.getElement());

        //MARK: draw other ships
        const playerIds = Object.keys(players) as Array<PlayerId>;
        playerIds.forEach((id) => {
            if (players[id] && id !== clientState.localPlayerId) {

                const player = players[id];
                const shipPosition = player.location.position;
                const ship = new Ship(
                    shipPosition.x,
                    shipPosition.y,
                    COLOR[id],
                    id
                );
                ship.setInfluence(player.influence);
                clientState.konva.opponentShips.push(ship);
                this.layer.add(ship.getElement());
            }
        });

        if (!clientState.localPlayerId) {
            const payload: InfoEventPayload = { text: 'You are a spectator' };
            this.broadcastEvent(EVENT.info, payload);

            return;
        }

        //MARK: draw local ship
        const shipPosition = localPlayer.location.position;
        const playerShip = new PlayerShip(
            this.stage,
            this.layer,
            shipPosition.x,
            shipPosition.y,
            COLOR[clientState.localPlayerId],
        );
        playerShip.setInfluence(localPlayer.influence);
        playerShip.switchControl(localPlayer.isActive);

        this.layer.add(playerShip.getElement());
        clientState.konva.localShip.object = playerShip;

        // MARK: draw cargo hold
        // const cargoHold = new PlayMat(this.matchCargoHoldColor(COLOR[state.localPlayerId]));
        // this.layer.add(cargoHold.getElement());
        // state.konva.localCargoHold = cargoHold;
}

    public updateElements() {
        const serverState = clientState.sharedState as SharedState;
        const players = serverState.players;
        const localPlayer = players[clientState.localPlayerId as PlayerId];
        const mapState = clientState.konva;
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

            // const localCargoHold = mapState.localCargoHold as PlayMat;
            // localCargoHold.updateHold(localPlayer.cargo);
        }
    }
}
