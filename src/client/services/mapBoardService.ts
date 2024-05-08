import Konva from 'konva';
import { PlayerId, InfoEventPayload } from '../../shared_types';
import { Service, ServiceInterface} from "./service";
import { Ship } from '../canvas_objects/ship';
import { PlayerShip } from '../canvas_objects/playerShip';
import { MapHex } from '../canvas_objects/mapHex';
import { Barrier } from '../canvas_objects/barrier';
import state from '../state';
import clientConstants from '../client_constants';
import sharedConstants from '../../shared_constants';

export interface MapBoardInterface extends ServiceInterface {
    initiateCanvas: () => void,
    drawBoard: () => void,
    updateBoard: () => void,
}

const { COLOR, HEX_OFFSET_DATA } = clientConstants;
const { EVENT } = sharedConstants;

export class MapBoardService extends Service implements MapBoardInterface {
    stage: Konva.Stage;
    layer: Konva.Layer;
    center: { x: number, y: number };

    constructor() {
        super();
    }

    initiateCanvas = () => {
        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: true,
            opacity: 1,
            width: 500,
            height: 500,
        });
        this.center = { x: this.stage.width() / 2, y: this.stage.height() / 2 };
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        this.layer.draw();
    }

    drawBoard = () => {
        const players = state.server.players;
        const localPlayer = players[state.localPlayerId];
        const localPlayerHexColor = localPlayer?.isActive ? COLOR.illegal : COLOR.anchored;
        //MARK: Map hexes
        HEX_OFFSET_DATA.forEach(hexItem => {
            const hexElement = new MapHex(
                this.center,
                hexItem.id,
                hexItem.x, hexItem.y,
                localPlayer?.location.hexId === hexItem.id
                    ? localPlayerHexColor
                    : COLOR.default
            ) as Konva.RegularPolygon;
            state.konva.hexes.push(hexElement);
            this.layer.add(hexElement);
        });

        // MARK: Barriers
        const barriers = state.server.setup.barriers
        const barrier_1 = new Barrier(this.center, barriers[0]) as Konva.Rect;
        const barrier_2 = new Barrier(this.center, barriers[1]) as Konva.Rect
        this.layer.add(barrier_1, barrier_2);

        //MARK: Other ships
        const playerIds = Object.keys(players) as PlayerId[];
        playerIds.forEach((id) => {
            if (players[id] && id != state.localPlayerId) {

                const player = players[id];
                const shipPosition = player.location.position ?? this.center;
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

        //MARK: Local ship
        const shipPosition = localPlayer.location.position ?? this.center;
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
    }

    updateBoard = () => {
        const players = state.server.players;
        const localPlayer = players[state.localPlayerId];
        const mapState = state.konva;

        mapState.hexes.forEach(hex => {
            const hexId = hex.attrs.id;
            let hexColor = COLOR.default;

            if (localPlayer?.location.hexId === hexId) {
                hexColor = localPlayer.isActive && false === localPlayer.isAnchored
                    ? COLOR.illegal
                    : COLOR.anchored;
            }
            hex.fill(hexColor);
        });

        mapState.opponentShips.forEach(ship => {
            const opponentId: PlayerId = ship.getId();

            if (players[opponentId]) {
                const shipPosition = players[opponentId].location.position ?? this.center;
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
            const localShip = mapState.localShip.object;
            localShip.switchControl(localPlayer.isActive && localPlayer.moveActions > 0);
            localShip.setPosition(localPlayer.location.position ?? this.center);
            localShip.setInfluence(localPlayer.influence);
        }
    }
}
