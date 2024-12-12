import Konva from 'konva';
import { MegaGroupInterface, GroupLayoutData } from '../client_types';
import { PlayerPlacard } from '../groups/GroupList';
import state from '../state';
import { Player } from '../../shared_types';

export class PlayerGroup implements MegaGroupInterface {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private playerPlacards: Array<PlayerPlacard> = [];

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[0].add(this.group);
        this.stage = stage;
    }

    // MARK: DRAW
    public drawElements(): void {
        const verticalOffsets = [20, 140, 260, 380];

        const playersByLocalPlayer = state.local.playerColor
            ? (() => {
                const players = [...state.received.players];
                while (players[0].id !== state.local.playerColor) {
                    players.push(players.shift() as Player);
                }
                return players;
            })()
            : state.received.players;

        playersByLocalPlayer.forEach(player => {
            const placard = new PlayerPlacard(
                this.stage,
                player,
                state.local.playerColor,
                verticalOffsets.shift() as number
            );
            this.group.add(placard.getElement());
            this.playerPlacards.push(placard);
        });
    }

    // MARK: UPDATE
    public update(): void {

        this.playerPlacards.forEach(placard => {
            const player = state.received.players.find(player => player.id === placard.getId());
            if (player) {
                placard.update(player);
            } else {
                placard.getElement().destroy();
            }
        });
    }

    public disable(): void {
        this.playerPlacards.forEach(placard => placard.disable());
    }
}