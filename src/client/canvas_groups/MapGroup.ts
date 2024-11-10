import Konva from 'konva';
import { Coordinates, GameSetupDetails, PlayerId, SharedState } from '../../shared_types';
import { CanvasGroupInterface, GroupLayoutData } from '../client_types';
import { Ship } from '../canvas_objects/Ship';
import { PlayerShip } from '../canvas_objects/PlayerShip';
import { MapHex } from '../canvas_objects/MapHex';
import { Barrier } from '../canvas_objects/Barrier';
import clientState from '../state';
import clientConstants from '../client_constants';
import { AnchorDial } from '../canvas_objects/AnchorDial';

const { COLOR, HEX_OFFSET_DATA, ISLAND_DATA, SETTLEMENT_DATA, SHIP_DATA } = clientConstants;

export class MapGroup implements CanvasGroupInterface {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private anchorDial: AnchorDial|null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.stage = stage;
        const layer = stage.getLayers()[0];

        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
        });
        layer.add(this.group);
    }

    public drawElements(): void {
        const centerPoint = { x: this.group.width()/2, y: this.group.height()/2 };
        const serverState = clientState.received as SharedState;
        const players = serverState.players;
        const localPlayer = players.find(player => player.id === clientState.localPlayerId);

        //MARK: draw anchor
        if (localPlayer) {
            this.anchorDial = new AnchorDial(localPlayer.isAnchored);
            this.group.add(this.anchorDial.getElement());
        }
        //MARK: draw hexes
        HEX_OFFSET_DATA.forEach(hexItem => {
            const mapHex = new MapHex(
                centerPoint,
                hexItem.id,
                hexItem.x,
                hexItem.y,
                ISLAND_DATA[hexItem.id],
                SETTLEMENT_DATA[serverState.setup.settlements[hexItem.id]],
                localPlayer?.location.hexId === hexItem.id
                    ? (localPlayer?.isActive ? COLOR.illegal : COLOR.anchored)
                    : COLOR.default
            );
            clientState.konva.hexes.push(mapHex);
            this.group.add(mapHex.getElement());
        });

        // MARK: draw barriers
        const barriers = serverState.setup.barriers
        const barrier_1 = new Barrier(centerPoint, barriers[0]);
        const barrier_2 = new Barrier(centerPoint, barriers[1]);
        this.group.add(barrier_1.getElement(), barrier_2.getElement());

        //MARK: draw other ships
        players.forEach(player => {

            if (player.id && player.id !== clientState.localPlayerId) {
                const shipPosition = player.location.position;
                const ship = new Ship(
                    shipPosition.x,
                    shipPosition.y,
                    COLOR[player.id],
                    player.id
                );
                ship.setInfluence(player.influence);
                clientState.konva.opponentShips.push(ship);
                this.group.add(ship.getElement());
            }
        });

        if (!clientState.localPlayerId) {
            return;
        }

        //MARK: draw local ship
        const shipPosition = localPlayer?.location.position;

        if (!shipPosition) {
            throw new Error('Missing player data!');
        }

        const playerShip = new PlayerShip(
            this.stage,
            shipPosition.x,
            shipPosition.y,
            COLOR[clientState.localPlayerId],
        );
        playerShip.setInfluence(localPlayer.influence);
        playerShip.switchControl(localPlayer.isActive);

        this.group.add(playerShip.getElement());
        clientState.konva.localShip.object = playerShip;
    }

    public updateElements() {
        const serverState = clientState.received as SharedState;
        const players = serverState.players;
        const localPlayer = players.find(player => player.id === clientState.localPlayerId);
        const mapState = clientState.konva;

        //MARK: update anchor
        if (localPlayer) {
            this.anchorDial?.updateElements(localPlayer.isAnchored);
        }

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

            const player = players.find(player => player.id === opponentId);
            if (player) {
                const shipPosition = player.location.position;
                ship.setPosition(shipPosition);
                ship.setInfluence(player.influence);
            } else {
                ship.destroy();
                // TODO: remove ship element from layer
                // TODO: implement a forfeit action to update the server state
            }
        });

        if (localPlayer) {
            const localShip = mapState.localShip.object as PlayerShip;
            localShip.switchControl(localPlayer.isActive);
            localShip.setPosition(localPlayer.location.position);
            localShip.setInfluence(localPlayer.influence);
        }
    }

    public calculateShipPositions(): GameSetupDetails {
        const startingPositions: Array<Coordinates> = [];

        SHIP_DATA.setupDrifts.forEach((drift) => {
            startingPositions.push({
                x: this.group.width()/2 + drift.x,
                y: this.group.height()/2 + drift.y
            });
        });

        return { setupCoordinates: startingPositions };
    }
}
