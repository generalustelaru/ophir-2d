import Konva from 'konva';
import { Action, Coordinates, GameSetupPayload, LocationName, PlayerColor, SharedState } from '../../shared_types';
import { MegaGroupInterface, GroupLayoutData, LocationIconData } from '../client_types';
import { MapHexagon, BarrierToken, ShipToken, PlayerShip, MovesDial, EndTurnButton, ActionDial, FavorButton } from '../groups/GroupList';
import state from '../state';
import clientConstants from '../client_constants';

const { COLOR, HEX_OFFSET_DATA, ISLAND_DATA, LOCATION_TOKEN_DATA, SHIP_DATA, TEMPLE_CONSTRUCTION_DATA} = clientConstants;

export class MapGroup implements MegaGroupInterface {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private movesDial: MovesDial | null = null;
    private endTurnButton: EndTurnButton | null = null;
    private actionDial: ActionDial | null = null;
    private favorButton: FavorButton | null = null;
    private mapHexes: Array<MapHexagon> = [];
    private opponentShips: Array<ShipToken> = [];
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
        const serverState = state.received as SharedState;
        const players = serverState.players;
        const localPlayer = players.find(player => player.id === state.local.playerColor);
        const isActivePlayer = localPlayer?.isActive || false;
        //MARK: dials
        this.movesDial = new MovesDial(isActivePlayer);

        this.endTurnButton = new EndTurnButton(
            this.stage,
            this.group,
            { action: Action.end_turn, payload: null },
            isActivePlayer,
        );

        this.favorButton = new FavorButton(
            this.stage,
            { action: Action.spend_favor, payload: null },
            localPlayer || null,
            { width: 50, height: 50, x: 500, y: 70 },
        );

        this.actionDial = new ActionDial(this.group, isActivePlayer);

        this.group.add(...[
            this.movesDial.getElement(),
            this.endTurnButton.getElement(),
            this.actionDial.getElement(),
            this.favorButton.getElement(),
        ]);

        //MARK: hexes
        HEX_OFFSET_DATA.forEach(hexItem => {
            const locationData = serverState.setup.mapPairings[hexItem.id];
            const mapHex = new MapHexagon(
                this.stage,
                centerPoint,
                hexItem.id,
                hexItem.x,
                hexItem.y,
                ISLAND_DATA[hexItem.id],
                locationData.name,
                this.getIconData(locationData.name),
                COLOR.defaultHex,
            );
            this.mapHexes.push(mapHex);
            this.group.add(mapHex.getElement());
        });

        // MARK: barriers
        const barriersIds = serverState.setup.barriers
        const barrier_1 = new BarrierToken(centerPoint, barriersIds[0]);
        const barrier_2 = new BarrierToken(centerPoint, barriersIds[1]);
        this.group.add(barrier_1.getElement(), barrier_2.getElement());

        //MARK: ships
        players.forEach(player => {

            if (player.id && player.id !== state.local.playerColor) {
                const shipPosition = player.bearings.position;
                const ship = new ShipToken(
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

        if (!state.local.playerColor) {
            return;
        }

        //MARK: player ship
        const shipPosition = localPlayer?.bearings.position;

        if (!shipPosition) {
            throw new Error('Missing player data!');
        }

        this.localShip = new PlayerShip(
            this.stage,
            shipPosition.x,
            shipPosition.y,
            COLOR[state.local.playerColor],
            localPlayer.isActive,
            this.mapHexes,
        );
        this.localShip.switchControl(localPlayer.isActive);

        this.group.add(this.localShip.getElement());
    }

    // MARK: UPDATE
    public update(): void {
        const serverState = state.received as SharedState;
        const players = serverState.players;
        const localPlayer = players.find(player => player.id === state.local.playerColor);

        //MARK: dials & hexes
        if (localPlayer) {
            this.movesDial?.update(localPlayer);
            this.endTurnButton?.update(localPlayer);
            this.actionDial?.update(localPlayer);
            this.favorButton?.update(localPlayer);
        }

        for (const mapHex of this.mapHexes) {
            mapHex.update({
                player: localPlayer || null,
                templeIcon: this.getIconData(mapHex.getTokenId())
            });
        }

        // MARK: ships
        this.opponentShips.forEach(ship => {
            const opponentId: PlayerColor = ship.getId();
            const player = players.find(player => player.id === opponentId);

            if (player) {
                ship.update(player);
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
            localShip.update(localPlayer.bearings.position);
        }
    }

    public disable(): void {
        this.localShip?.switchControl(false);
        this.endTurnButton?.disableAction();
        this.favorButton?.disableAction();
    }

    public calculateShipPositions(): GameSetupPayload {
        const startingPositions: Array<Coordinates> = [];

        SHIP_DATA.setupDrifts.forEach((drift) => {
            startingPositions.push({
                x: this.group.width() / 2 + drift.x,
                y: this.group.height() / 2 + drift.y
            });
        });

        return { setupCoordinates: startingPositions };
    }

    private getIconData(locationName: LocationName): LocationIconData {

        if (locationName != 'temple')
            return LOCATION_TOKEN_DATA[locationName];

        const skipCount = (() => {
            const playerCount = state.received.players.length;
            switch (playerCount) {
                case 2: return 2;
                case 3: return 1;
                default: return 0;
            }
        })();
        const currentLevel = state.received.temple?.currentLevel || 0;
        const templeData = TEMPLE_CONSTRUCTION_DATA.find(
            item => item.shapeId == currentLevel + skipCount
        );

        if (templeData)
            return templeData.icon;

        return LOCATION_TOKEN_DATA[locationName];
    }
}
