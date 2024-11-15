import Konva from 'konva';
import { Coordinates, GameSetupDetails, Player, PlayerId, SharedState } from '../../shared_types';
import { MegaGroupInterface, GroupLayoutData } from '../client_types';
import { MapHex, Barrier, Ship, PlayerShip, AnchorDial, MovesDial } from '../canvas_groups/CanvasGroups';
import clientState from '../state';
import clientConstants from '../client_constants';
import { Dispatcher } from '../Dispatcher';

const { COLOR, HEX_OFFSET_DATA, ISLAND_DATA, SETTLEMENT_DATA, SHIP_DATA } = clientConstants;

export class MapGroup implements MegaGroupInterface {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private anchorDial: AnchorDial | null = null;
    private movesDial: MovesDial | null = null;
    private mapHexes: Array<MapHex> = [];
    private opponentShips: Array<Ship> = [];
    private localShip: PlayerShip | null = null;
    private localPlayer: Player | null = null;

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

        if (localPlayer) {
            this.localPlayer = localPlayer;
        }

        this.anchorDial = new AnchorDial(this.group, localPlayer?.isActive ?? false);
        this.group.add(this.anchorDial.getElement());

        //MARK: anchor
        this.anchorDial?.getElement().on('mouseenter', () => {
            if (this.localPlayer?.isActive) {
                this.stage.container().style.cursor = 'pointer';
            }
        });

        this.anchorDial?.getElement().on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });

        this.anchorDial?.getElement().on('click', () => {

            if (this.localPlayer?.isActive && this.localPlayer.isAnchored) {

                return Dispatcher.getInstance().broadcastEvent(
                    'action',
                    { action: 'turn', details: null }
                );
            }
        });

        this.movesDial = new MovesDial(this.group, localPlayer?.isActive ?? false);
        this.group.add(this.movesDial.getElement());


        //MARK: hexes
        HEX_OFFSET_DATA.forEach(hexItem => {
            const mapHex = new MapHex(
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
            localPlayer.isActive,
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

        if (localPlayer) {
            this.localPlayer = localPlayer;

            //MARK: anchor
            this.anchorDial?.updateElement(localPlayer);

            //MARK: moves dial
            this.movesDial?.updateElement(localPlayer);

            //MARK: location hex
            for (const mapHex of this.mapHexes) {
                mapHex.setFill(
                    (
                    localPlayer.isActive
                    && localPlayer.location.hexId === mapHex.getId()
                    && localPlayer.allowedSettlementAction
                    ) ? COLOR.locationHex : COLOR.defaultHex
                );
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
            localShip.setInfluence(localPlayer.influence);
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
