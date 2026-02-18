import Konva from 'konva';
import {
    Action, Coordinates, GameSetupPayload, LocationName, Phase, PlayerColor, PlayState, SetupState,
    TradeGood,
    Unique,
} from '~/shared_types';
import {
    MegaGroupInterface, GroupLayoutData, IconLayer, LayerIds, SailAttemptArgs, DropBeforeLoadMessage,
} from '~/client_types';
import {
    SeaZone, BarrierToken, RemoteShip, PlayerShip, EndTurnButton, UndoButton, FavorButton, RivalShip,
} from '../groups/map';
import { MovesDial } from '../groups/popular';
import localState from '../state';
import clientConstants from '~/client_constants';

const { HUES, HEX_OFFSET_DATA, ISLAND_DATA, LOCATION_TOKEN_DATA, SHIP_DATA, TEMPLE_CONSTRUCTION_DATA } = clientConstants;

export class MapGroup implements Unique<MegaGroupInterface> {
    private group: Konva.Group;
    private shipGroup: Konva.Group;
    private stage: Konva.Stage;
    private movesDial: MovesDial | null = null;
    private endTurnButton: EndTurnButton | null = null;
    private endTurnCallback: Function;
    private sailAttemptCallback: (data: SailAttemptArgs) => void;
    private loadActionCallback: (data: DropBeforeLoadMessage) => void;
    private undoButton: UndoButton | null = null;
    private favorButton: FavorButton | null = null;
    private seaZones: Array<SeaZone> = [];
    private opponentShips: Array<RemoteShip> = [];
    private localShip: PlayerShip | null = null;
    private rivalShip: RivalShip | null = null;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        endTurnCallback: Function,
        sailAttemptCallback: (data: SailAttemptArgs) => void,
        dropBeforeLoadCallback: (data: DropBeforeLoadMessage) => void,
    ) {
        this.endTurnCallback = endTurnCallback;
        this.sailAttemptCallback = sailAttemptCallback;
        this.loadActionCallback = dropBeforeLoadCallback;
        this.group = new Konva.Group({ ...layout });
        stage.getLayers()[LayerIds.board].add(this.group);

        this.shipGroup = new Konva.Group({ ...layout });
        stage.getLayers()[LayerIds.ships].add(this.shipGroup);
        this.stage = stage;
    }

    public setPlacement(coordinates: Coordinates) {
        this.group.x(coordinates.x).y(coordinates.y);
        this.shipGroup.x(coordinates.x).y(coordinates.y);
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
                    HUES.defaultHex,
                    state.sessionPhase == Phase.play,
                    (tradeGood: TradeGood) => {
                        this.loadActionCallback(this.formatLoadMessage(tradeGood));
                    },
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
                templeIcon: this.getIconData(zone.getLocationName(), state),
                itemSupplies: state.itemSupplies,
            });
        }

        const players = state.players;
        const localPlayer = players.find(player => player.color === localState.playerColor);
        const isActivePlayer = localPlayer?.isActive || false;
        //MARK: dials/buttons
        this.movesDial = new MovesDial({ x: 15, y: 60 });

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

        this.undoButton = new UndoButton(
            this.stage,
            { x: 35, y : 375 },
            isActivePlayer,
        );

        this.group.add(...[
            this.movesDial.getElement(),
            this.endTurnButton.getElement(),
            this.undoButton.getElement(),
            this.favorButton.getElement(),
        ]);


        //MARK: ships
        const shipNodes: Array<Konva.Group> = [];
        players.forEach(player => {

            if (player.color && player.color !== localState.playerColor) {
                const { position } = player.bearings;
                const ship = new RemoteShip(
                    this.stage,
                    position.x,
                    position.y,
                    player,
                    this.seaZones,
                );
                this.opponentShips.push(ship);
                shipNodes.push(ship.getElement());
            }
        });

        if (state.rival.isIncluded) {
            this.rivalShip = new RivalShip(
                this.stage,
                this.seaZones,
                { ...state.rival, isDraggable: false },
            );
            shipNodes.push(this.rivalShip.getElement());
        }

        if (localState.playerColor) {
            const shipPosition = localPlayer?.bearings.position;

            if (!shipPosition)
                throw new Error('Missing player data!');

            this.localShip = new PlayerShip(
                this.stage,
                shipPosition.x,
                shipPosition.y,
                this.seaZones,
                state.players,
                state.rival,
                this.sailAttemptCallback,
            );
            this.localShip.switchControl(localPlayer.isActive);
            shipNodes.push(this.localShip.getElement());
        }

        this.shipGroup.add( ...shipNodes );
    }

    // MARK: UPDATE
    public update(state: PlayState): void {
        const players = state.players;
        const localPlayer = players.find(player => player.color === localState.playerColor);
        //MARK: dials & hexes
        if (localPlayer) {
            const { moveActions: moves, isActive } = localPlayer;
            this.movesDial?.update({ moves, isActive });
            this.endTurnButton?.update(localPlayer);
            this.undoButton?.update(localPlayer);
            this.favorButton?.update(localPlayer);
        }

        for (const zone of this.seaZones) {
            zone.update({
                localPlayer: localPlayer || null,
                rival: state.rival,
                templeIcon: this.getIconData(zone.getLocationName(), state),
                itemSupplies: state.itemSupplies,
            });
        }

        // MARK: ships
        const canDrag = localPlayer?.isActive && state.sessionPhase == Phase.play || false;
        this.opponentShips.forEach(ship => {
            const opponentId: PlayerColor = ship.getId();
            const remotePlayer = players.find(player => player.color === opponentId);

            if (remotePlayer) {
                ship.update({ remotePlayer, isDraggable: canDrag });
            } else {
                ship.destroy();
                // TODO: implement a forfeit action for abandoning a session.
                // TODO: Remove player elements when client leaves the game.
            }
        });

        if (this.rivalShip && state.rival.isIncluded) {
            this.rivalShip.update({ ...state.rival, isDraggable: canDrag });
        }

        if (localPlayer) {
            const localShip = this.localShip as PlayerShip;

            localShip.switchControl(
                state.sessionPhase == Phase.play && localPlayer.isActive && !localPlayer.isHandlingRival,
            );
            localShip.update(localPlayer.bearings.position, state.players, state.rival);
        }
    }

    public disable(): void {
        this.localShip?.switchControl(false);
        this.endTurnButton?.disable();
        this.favorButton?.disable();
        this.undoButton?.disable();
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

    private formatLoadMessage(tradeGood: TradeGood): DropBeforeLoadMessage {
        return { action: Action.load_good, payload: { tradeGood, drop: null } };
    }
}
