import Konva from 'konva';
import { PlayerId, InfoEventPayload } from '../types';
import { Service, ServiceInterface} from "./service";
import { Ship } from '../canvas_objects/ship';
import { PlayerShip } from '../canvas_objects/playerShip';
import { MapHex } from '../canvas_objects/mapHex';
import { Barrier } from '../canvas_objects/barrier';
import state from '../state';
import constants from '../constants.json';

interface MapBoardInterface extends ServiceInterface {
    initiateCanvas: () => void,
    drawBoard: () => void,
    updateBoard: () => void,
}

const { COLOR, HEX_OFFSET_DATA, EVENT } = constants;

export class MapBoardService extends Service implements MapBoardInterface {
    stage: Konva.Stage;
    layer: Konva.Layer;
    center: { x: number, y: number };

    constructor() {
        super();
    }

    initiateCanvas = () => {
        this.stage = new Konva.Stage({
            container: 'container',
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
        //MARK: Map hexes
        HEX_OFFSET_DATA.forEach(hexItem => {
            const hexElement = new MapHex(
                this.center,
                hexItem.id,
                hexItem.x,
                hexItem.y,
                players[state.localPlayerId]?.location.hexId == hexItem.id
                && players[state.localPlayerId].isActive
                    ? COLOR.illegal
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

                const shipPosition = players[id].location.position ?? this.center;
                const ship = new Ship(
                    shipPosition.x,
                    shipPosition.y,
                    COLOR[id],
                    id
                ).getElement();
                state.konva.opponentShips.push(ship);
                this.layer.add(ship);
            }
        });

        if (!state.localPlayerId) {
            const payload: InfoEventPayload = { text: 'You are a spectator' };
            this.broadcastEvent(EVENT.info, payload);

            return;
        }

        //MARK: Local ship
        const localPlayer = players[state.localPlayerId];
        const shipPosition = localPlayer.location.position ?? this.center;
        state.konva.localShip.object = new PlayerShip(
            this.stage,
            this.layer,
            shipPosition.x,
            shipPosition.y,
            COLOR[state.localPlayerId],
        );
        state.konva.localShip.object.switchControl(localPlayer.isActive);

        this.layer.add(state.konva.localShip.object.getElement());
    }

    updateBoard = () => {
        const players = state.server.players;
        const localPlayer = players[state.localPlayerId];
        const mapState = state.konva;

        mapState.hexes.forEach(hex => {
            const hexId = hex.attrs.id;
            const hexColor = localPlayer?.location.hexId === hexId
                ? players[state.localPlayerId].isActive
                    ? COLOR.illegal
                    : COLOR.anchored
                : COLOR.default;
            hex.fill(hexColor);
        });

        mapState.opponentShips.forEach(ship => {
            const opponentId: PlayerId = ship.attrs.id;

            if (players[opponentId]) {
                const shipPosition = players[opponentId].location.position ??
                    this.center;
                ship.x(shipPosition.x);
                ship.y(shipPosition.y);
                this.layer.batchDraw();
            } else {
                const payload: InfoEventPayload = { text: `${opponentId} has left the game` };
                this.broadcastEvent(EVENT.info, payload);
                ship.destroy();
            }
        });

        mapState.localShip.object?.switchControl(localPlayer.isActive);
    }
}
