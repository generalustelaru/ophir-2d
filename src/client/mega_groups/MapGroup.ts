import Konva from 'konva';
import {
    Action, Coordinates, GameSetupPayload, LocationName, Phase, PlayerColor, PlayState, SetupState,
} from '~/shared_types';
import { MegaGroupInterface, GroupLayoutData, IconLayer, LayerIds } from '~/client_types';
import {
    SeaZone, BarrierToken, RemoteShip, PlayerShip, MovesDial, EndTurnButton, ActionDial, FavorButton, RivalShip,
} from '../groups/map';
import localState from '../state';
import clientConstants from '~/client_constants';

const { COLOR, HEX_OFFSET_DATA, ISLAND_DATA, LOCATION_TOKEN_DATA, SHIP_DATA, TEMPLE_CONSTRUCTION_DATA } = clientConstants;

export class MapGroup implements MegaGroupInterface {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private movesDial: MovesDial | null = null;
    private endTurnButton: EndTurnButton | null = null;
    private endTurnCallback: Function;
    private actionDial: ActionDial | null = null;
    private favorButton: FavorButton | null = null;
    private seaZones: Array<SeaZone> = [];
    private opponentShips: Array<RemoteShip> = [];
    private localShip: PlayerShip | null = null;
    private rivalShip: RivalShip | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData, endTurnCallback: Function) {
        this.endTurnCallback = endTurnCallback;
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[LayerIds.base].add(this.group);
        this.stage = stage;
    }

    // MARK: DRAW
    public drawElements(state: PlayState|SetupState): void {

        if(this.seaZones.length === 0) {
            const centerPoint = { x: this.group.width() / 2, y: this.group.height() / 2 };
            //MARK: hexes
            HEX_OFFSET_DATA.forEach(hexItem => {
                const locationData = state.setup.mapPairings.locationByZone[hexItem.id];
                const seaZone = new SeaZone(
                    this.stage,
                    centerPoint,
                    hexItem.id,
                    hexItem.x,
                    hexItem.y,
                    ISLAND_DATA[hexItem.id],
                    locationData.name,
                    this.getIconData(locationData.name, state),
                    COLOR.defaultHex,
                );
                this.seaZones.push(seaZone);
                this.group.add(seaZone.getElement());
            });
            // MARK: barriers
            const barriersIds = state.setup.barriers;
            const barrier_1 = new BarrierToken(centerPoint, barriersIds[0]);
            const barrier_2 = new BarrierToken(centerPoint, barriersIds[1]);
            this.group.add(barrier_1.getElement(), barrier_2.getElement());
        }

        if(state.sessionPhase === Phase.setup)
            return;

        for (const zone of this.seaZones) {
            zone.update({
                localPlayer: null,
                rival: state.rival,
                templeIcon: this.getIconData(zone.getTokenId(), state),
                itemSupplies: state.itemSupplies,
            });
        }

        const players = state.players;
        const localPlayer = players.find(player => player.color === localState.playerColor);
        const isActivePlayer = localPlayer?.isActive || false;
        //MARK: dials
        this.movesDial = new MovesDial(isActivePlayer);

        this.endTurnButton = new EndTurnButton(
            this.stage,
            this.group,
            () => this.endTurnCallback(),
            isActivePlayer,
        );

        this.favorButton = new FavorButton(
            this.stage,
            { action: Action.spend_favor, payload: null },
            localPlayer || null,
            { width: 50, height: 50, x: 500, y: 70 },
        );

        this.actionDial = new ActionDial(this.stage, this.group, isActivePlayer);

        this.group.add(...[
            this.movesDial.getElement(),
            this.endTurnButton.getElement(),
            this.actionDial.getElement(),
            this.favorButton.getElement(),
        ]);

        //MARK: ships

        if (state.rival.isIncluded) {
            this.rivalShip = new RivalShip(
                this.stage,
                this.seaZones,
                state.rival,
                localState.playerColor,
            );
            this.group.add(this.rivalShip.getElement());
        }

        players.forEach(player => {

            if (player.color && player.color !== localState.playerColor) {
                const { position } = player.bearings;
                const ship = new RemoteShip(
                    position.x,
                    position.y,
                    COLOR[player.color],
                    player.isActive,
                    player.color,
                );
                this.opponentShips.push(ship);
                this.group.add(ship.getElement());
            }
        });

        if (!localState.playerColor) {
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
            COLOR[localState.playerColor],
            localPlayer.isActive,
            this.seaZones,
            state.players,
            state.rival,
        );
        this.localShip.switchControl(localPlayer.isActive);

        this.group.add(this.localShip.getElement());
    }

    // MARK: UPDATE
    public update(state: PlayState): void {
        const players = state.players;
        const localPlayer = players.find(player => player.color === localState.playerColor);

        //MARK: dials & hexes
        if (localPlayer) {
            this.movesDial?.update(localPlayer);
            this.endTurnButton?.update(localPlayer);
            this.actionDial?.update(localPlayer);
            this.favorButton?.update(localPlayer);
        }

        if (this.rivalShip && state.rival.isIncluded) {
            const { isControllable, bearings, activePlayerColor, destinations, moves } = state.rival;
            this.rivalShip.update({
                isControllable,
                bearings,
                activePlayerColor,
                destinations,
                moves,
            });
        }

        for (const zone of this.seaZones) {
            zone.update({
                localPlayer: localPlayer || null,
                rival: state.rival,
                templeIcon: this.getIconData(zone.getTokenId(), state),
                itemSupplies: state.itemSupplies,
            });
        }

        // MARK: ships
        this.opponentShips.forEach(ship => {
            const opponentId: PlayerColor = ship.getId();
            const player = players.find(player => player.color === opponentId);

            if (player) {
                ship.update(player);
            } else {
                ship.destroy();
                // TODO: implement a forfeit action for abandoning a session.
                // TODO: Remove player elements when client leaves the game.
            }
        });

        //MARK: player ship
        if (localPlayer) {
            const localShip = this.localShip as PlayerShip;

            localShip.switchControl(localPlayer.isActive && !localPlayer.isHandlingRival);
            localShip.switchHighlight(localPlayer.isActive);
            localShip.update(localPlayer.bearings.position, state.players, state.rival);
        }
    }

    public disable(): void {
        this.localShip?.switchControl(false);
        this.endTurnButton?.disable();
        this.favorButton?.disable();
    }

    // MARK: SETUP
    public createSetupPayload(): GameSetupPayload {
        const centerPoint = { x: this.group.width() / 2, y: this.group.height() / 2 };

        const startingPositions: Array<Coordinates> = [];
        SHIP_DATA.setupDrifts.forEach((drift) => {
            startingPositions.push({
                x: centerPoint.x + drift.x,
                y: centerPoint.y + drift.y,
            });
        });

        const hexPositions = HEX_OFFSET_DATA.map(h => {
            return {
                id: h.id,
                x: centerPoint.x - h.x,
                y: centerPoint.y - h.y,
            };
        });

        return {
            hexPositions,
            startingPositions,
        };
    }

    // MARK: PRIVATE
    private getIconData(locationName: LocationName, state: PlayState | SetupState): IconLayer {

        if (locationName != 'temple' || state.sessionPhase === Phase.setup)
            return LOCATION_TOKEN_DATA[locationName];

        const skipCount = (() => {
            const playerCount = state.players.length;
            switch (playerCount) {
                case 2: return 2;
                case 3: return 1;
                default: return 0;
            }
        })();
        const currentLevel = state.temple.currentLevel || 0;
        const templeData = TEMPLE_CONSTRUCTION_DATA.find(
            item => item.shapeId == currentLevel + skipCount,
        );

        if (templeData)
            return templeData.icon;

        return LOCATION_TOKEN_DATA[locationName];
    }
}
