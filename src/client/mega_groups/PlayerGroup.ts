import Konva from 'konva';
import { MegaGroupInterface, GroupLayoutData } from '../client_types';
import { PlayerPlacard } from '../groups/GroupList';
import localState from '../state';
import { Player, GameState } from '../../shared_types';
import { RivalPlacard } from '../groups/player/RivalPlacard';

export class PlayerGroup implements MegaGroupInterface {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private playerPlacards: Array<PlayerPlacard> = [];
    private rivalPlacard: RivalPlacard | null = null;

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
    public drawElements(state: GameState): void {
        const verticalOffsets = [20, 140, 260, 380];
        const { players, rival } = state;

        const playersByLocalPlayer = localState.playerColor
            ? (() => {
                while (players[0].id !== localState.playerColor) {
                    players.push(players.shift() as Player);
                }
                return players;
            })()
            : state.players;

        playersByLocalPlayer.forEach(player => {
            const placard = new PlayerPlacard(
                this.stage,
                player,
                localState.playerColor,
                verticalOffsets.shift() as number
            );
            this.group.add(placard.getElement());
            this.playerPlacards.push(placard);
        });

        if (rival.isIncluded) {
            const { isControllable, activePlayerColor, influence } = rival;
            this.rivalPlacard = new RivalPlacard(
                this.stage,
                { isControllable, activePlayerColor, influence },
                localState.playerColor,
                verticalOffsets.shift() as number,
            );

            this.group.add(this.rivalPlacard.getElement());
        }
    }

    // MARK: UPDATE
    public update(state: GameState): void {

        this.playerPlacards.forEach(placard => {
            const player = state.players.find(player => player.id === placard.getId());
            if (player) {
                placard.update(player);
            } else {
                placard.getElement().destroy();
            }
        });

        if (state.rival.isIncluded && this.rivalPlacard) {
            const { isControllable, activePlayerColor, influence } = state.rival;

            this.rivalPlacard.update({ isControllable, activePlayerColor, influence });
        }
    }

    public disable(): void {
        this.playerPlacards.forEach(placard => placard.disable());
    }
}