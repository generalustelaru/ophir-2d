import Konva from 'konva';
import { Coordinates, GameSetupDetails, PlayerId, SharedState } from '../../shared_types';
import { MegaGroupInterface, GroupLayoutData } from '../client_types';
import { MapHex, Barrier, Ship, PlayerShip, AnchorDial, ActionDial } from '../canvas_groups/CanvasGroups';
import clientState from '../state';
import clientConstants from '../client_constants';

const { COLOR, HEX_OFFSET_DATA, ISLAND_DATA, SETTLEMENT_DATA, SHIP_DATA } = clientConstants;

export class MapGroup implements MegaGroupInterface {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private anchorDial: AnchorDial | null = null;
    private movesDial: ActionDial | null = null;
    private mapHexes: Array<MapHex> = [];
    private opponentShips: Array<Ship> = [];
    private localShip: PlayerShip | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.stage = stage;
        const layer = stage.getLayers()[0];

        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        layer.add(this.group);
    }

    // MARK: DRAW
    public drawElements(): void {
        const centerPoint = { x: this.group.width() / 2, y: this.group.height() / 2 };
        const serverState = clientState.received as SharedState;
        const players = serverState.players;
        const localPlayer = players.find(player => player.id === clientState.localPlayerId);

        //MARK: dials
        this.anchorDial = new AnchorDial(
            this.stage,
            this.group,
            { action: 'end_turn', details: null },
            localPlayer?.isActive ?? false,
            );
        this.group.add(this.anchorDial.getElement());

        this.movesDial = new ActionDial(this.group, localPlayer?.isActive ?? false);
        this.group.add(this.movesDial.getElement());


        //MARK: hexes
        HEX_OFFSET_DATA.forEach(hexItem => {
            const mapHex = new MapHex(
                this.stage,
                centerPoint,
                hexItem.id,
                hexItem.x,
                hexItem.y,
                ISLAND_DATA[hexItem.id],
                SETTLEMENT_DATA[serverState.setup.settlements[hexItem.id]],
                COLOR.defaultHex,
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
                    player.isActive,
                    player.id
                );
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
            localPlayer.isActive,
            this.mapHexes,
        );
        this.localShip.switchControl(localPlayer.isActive);

        this.group.add(this.localShip.getElement());
    }

    // MARK: UPDATE
    public updateElements(): void {
        const serverState = clientState.received as SharedState;
        const players = serverState.players;
        const localPlayer = players.find(player => player.id === clientState.localPlayerId);

        if (localPlayer) {
            //MARK: dials & hexes
            this.anchorDial?.updateElement(localPlayer);
            this.movesDial?.updateElement(localPlayer);

            for (const mapHex of this.mapHexes) {
                mapHex.updateElement(localPlayer);
            }
        }

        // MARK: ships
        this.opponentShips.forEach(ship => {
            const opponentId: PlayerId = ship.getId();
            const player = players.find(player => player.id === opponentId);

            if (player) {
                ship.updateElement(player);
            } else {
                ship.destroy();
                // TODO: remove ship element from layer
                // TODO: implement a forfeit action to update the server state
            }
        });

        //MARK: player ship
        if (localPlayer) {
            const localShip = this.localShip as PlayerShip;
            localShip.switchControl(localPlayer.isActive);
            localShip.switchHighlight(localPlayer.isActive);
            localShip.updateElement(localPlayer.location.position);
        }
    }

    public calculateShipPositions(): GameSetupDetails {
        const startingPositions: Array<Coordinates> = [];

        SHIP_DATA.setupDrifts.forEach((drift) => {
            startingPositions.push({
                x: this.group.width() / 2 + drift.x,
                y: this.group.height() / 2 + drift.y
            });
        });

        return { setupCoordinates: startingPositions };
    }
}
