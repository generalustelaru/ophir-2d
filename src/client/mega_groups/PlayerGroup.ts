import Konva from 'konva';
import { MegaGroupInterface, GroupLayoutData, LayerIds } from '~/client_types';
import { Player, PlayerColor, PlayState, Unique } from '~/shared_types';
import { PlayerPlacard, RivalPlacard } from '../groups/player';
import localState from '../state';

export class PlayerGroup implements Unique<MegaGroupInterface> {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private playerPlacards: Array<PlayerPlacard> = [];
    private rivalPlacard: RivalPlacard | null = null;
    private endRivalTurnCallback: ((isShiftingMarket: boolean) => void) | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[LayerIds.board].add(this.group);
        this.stage = stage;
    }

    public setRivalCallback(callback: (p: boolean) => void) {
        this.endRivalTurnCallback = callback;
    }

    // MARK: DRAW
    public drawElements(state: PlayState): void {
        const verticalOffsets = [20, 140, 260, 380];
        const { players, rival } = state;

        const playersByLocalPlayer = localState.playerColor
            ? (() => {
                while (players[0].color !== localState.playerColor) {
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
                verticalOffsets.shift() as number,
            );
            this.group.add(placard.getElement());
            this.playerPlacards.push(placard);
        });

        if (rival.isIncluded) {
            if (!this.endRivalTurnCallback)
                throw new Error('Cannot add rival placard. Callback not initialized.');

            this.rivalPlacard = new RivalPlacard(
                this.stage,
                this.endRivalTurnCallback,
                localState.playerColor,
                rival,
                verticalOffsets.shift() as number,
            );

            this.group.add(this.rivalPlacard.getElement());
        }
    }

    // MARK: UPDATE
    public update(state: PlayState): void {

        this.playerPlacards.forEach(placard => {
            const player = state.players.find(player => player.color === placard.getId());
            if (player) {
                placard.update(player);
            } else {
                placard.getElement().destroy();
            }
        });

        if (state.rival.isIncluded && this.rivalPlacard) {
            this.rivalPlacard.update(state.rival);
        }
    }

    public updatePlayerVp(color: PlayerColor|null, vp: number) {
        const localPlacard = this.playerPlacards.find(placard => placard.getId() === color);
        localPlacard && localPlacard.updateVP(vp);
    }

    public disable(): void {
        this.playerPlacards.forEach(placard => {
            placard.isLocal() && placard.disable();
        });
    }
}
