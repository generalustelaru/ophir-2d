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
import { MovesDial } from '../canvas_objects/MovesDial';

const { COLOR, HEX_OFFSET_DATA, ISLAND_DATA, SETTLEMENT_DATA, SHIP_DATA } = clientConstants;

export class MapGroup implements CanvasGroupInterface {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private anchorDial: AnchorDial|null = null;
    private movesDial: MovesDial|null = null;
    private mapHexes: Array<MapHex> = [];
    private opponentShips: Array<Ship> = [];
    private localShip: PlayerShip|null = null;

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

    // MARK: DRAW
    public drawElements(): void {
        const centerPoint = { x: this.group.width()/2, y: this.group.height()/2 };
        const serverState = clientState.received as SharedState;
        const players = serverState.players;
        const localPlayer = players.find(player => player.id === clientState.localPlayerId);

        //MARK: anchor
        if (localPlayer) {
            this.anchorDial = new AnchorDial(this.group, localPlayer.isActive);
            this.group.add(this.anchorDial.getElement());

            this.movesDial = new MovesDial(this.group, localPlayer.isActive);
            this.group.add(this.movesDial.getElement());
        }

        //MARK: hexes
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
            this.mapHexes.push(mapHex);
            this.group.add(mapHex.getElement());
        });

        // MARK: barriers
        const barriers = serverState.setup.barriers
        const barrier_1 = new Barrier(centerPoint, barriers[0]);
        const barrier_2 = new Barrier(centerPoint, barriers[1]);
        this.group.add(barrier_1.getElement(), barrier_2.getElement());

        //MARK: ships
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
                this.opponentShips.push(ship);
                this.group.add(ship.getElement());
            }
        });

        if (!clientState.localPlayerId) {
            return;
        }

        //MARK: player ship
        const shipPosition = localPlayer?.location.position;

        if (!shipPosition) {
            throw new Error('Missing player data!');
        }

        this.localShip = new PlayerShip(
            this.stage,
            shipPosition.x,
            shipPosition.y,
            COLOR[clientState.localPlayerId],
            this.mapHexes,
        );
        this.localShip.setInfluence(localPlayer.influence);
        this.localShip.switchControl(localPlayer.isActive);

        this.group.add(this.localShip.getElement());
    }

    // MARK: UPDATE
    public updateElements() {
        const serverState = clientState.received as SharedState;
        const players = serverState.players;
        const localPlayer = players.find(player => player.id === clientState.localPlayerId);

        //MARK: anchor
        if (localPlayer) {
            this.anchorDial?.updateElements(localPlayer);
        }

        //MARK: moves dial
        if (localPlayer) {
            this.movesDial?.updadeElements(localPlayer);
        }

        //MARK: hexes
        this.mapHexes.forEach(hex => {
            const hexId = hex.getId();
            let hexColor = COLOR.default;

            if (localPlayer?.location.hexId === hexId) {
                hexColor = localPlayer.isActive && !localPlayer.isAnchored
                    ? COLOR.illegal
                    : COLOR.anchored;
            }

            hex.setFill(hexColor);
        });

        // MARK: ships
        this.opponentShips.forEach(ship => {
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
            const localShip = this.localShip as PlayerShip;
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
