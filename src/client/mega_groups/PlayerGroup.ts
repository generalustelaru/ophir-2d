import Konva from 'konva';
import { MegaGroupInterface, GroupLayoutData, LayerIds, Target } from '~/client_types';
import { Coordinates, Player, PlayerColor, PlayState, Unique } from '~/shared_types';
import { PlayerPlacard, RivalPlacard } from '../groups/player';
import { Highlight } from '../groups/tutorial';
import localState from '../state';

export class PlayerGroup implements Unique<MegaGroupInterface> {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private playerPlacards: Array<PlayerPlacard> = [];
    private rivalPlacard: RivalPlacard | null = null;
    private endRivalTurnCallback: ((isShiftingMarket: boolean) => void) | null = null;
    private highlights: Map<Target, Highlight> | null = null;

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

    public setPlacement(coordinates: Coordinates) {
        this.group?.x(coordinates.x).y(coordinates.y);
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

            this.rivalPlacard = new RivalPlacard(
                this.stage,
                this.endRivalTurnCallback || null,
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

    public switchToResults(state: PlayState): void {
        const results = state.gameResults;
        for (const placard of this.playerPlacards) {
            const color = placard.getId();
            const vp = results.find(r => r.color == color)?.vp || 0;
            placard.switchToResults(vp);
        }
        this.rivalPlacard && this.rivalPlacard.hideInfluence();
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

    public updateHighlights(targets: Array<Target>): void {
        if (!this.highlights) {
            this.highlights = new Map();
            const layouts = [
                { target: Target.playerGroup, layout: { x:0, y:0, width: 300, height: 250 } },

                { target: Target.playerPlacard, layout: { x: 0, y: 20, width: 300, height: 100 } },
                { target: Target.influenceDie, layout: { x: -5, y: 42, width: 55, height: 55 } },
                { target: Target.cargoBand, layout: { x: 55, y: 20, width: 108, height: 40 } },
                { target: Target.specialistBand, layout: { x: 165, y: 20, width: 130, height: 40 } },
                { target: Target.favorDial, layout: { x: 58, y: 60, width: 55, height: 55 } },
                { target: Target.coinDial, layout: { x: 108, y: 60, width: 55, height: 55 } },
                { target: Target.vpDial, layout: { x: 175, y: 60, width: 55, height: 55 } },
                { target: Target.specialtyButton, layout: { x: 237, y: 60, width: 55, height: 55 } },

                { target: Target.rivalPlacard, layout: { x: 0, y: 140, width: 300, height: 100 } },
                { target: Target.rivalInfluence, layout: { x: -5, y: 162, width: 55, height: 55 } },
                { target: Target.cycleMarket, layout: { x: 65, y: 140, width: 66, height: 100 } },
                { target: Target.concludeRival, layout: { x: 143, y: 155, width: 66, height: 66 } },
                { target: Target.rivalMoves, layout: { x: 143 + 66 + 5 + 3, y: 155, width: 66, height: 66 } },
            ];
            for (const item of layouts) {
                const { target, layout } = item;
                this.highlights.set(target, new Highlight({ isRectangle: true, layout }));
            }

            const nodes: Konva.Shape[] = [];
            this.highlights.forEach(highlight => {
                nodes.push(highlight.getElement());
            });
            this.group.add(...nodes);
        }

        this.highlights.forEach((highlight, key) => {
            if (targets.includes(key)) {
                highlight.isVisible() == false && highlight.show();
            } else {
                highlight.hide();
            }
        });
    }
}
