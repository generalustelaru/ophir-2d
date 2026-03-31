import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { PlayerColor, Rival, Unique } from '~/shared_types';
import { InfluenceDial, MovesDial } from '../popular';
import { ShiftMarketButton, ConcludeButton } from '.';
import clientConstants from '~/client_constants';

const { HUES, PLAYER_HUES } = clientConstants;

export class RivalPlacard implements Unique<DynamicGroupInterface<Rival>> {

    private localPlayerColor: PlayerColor | null;
    private group: Konva.Group;
    private background: Konva.Rect;
    private influenceDial: InfluenceDial;
    private shiftMarketButton: ShiftMarketButton;
    private concludeButton: ConcludeButton;
    private movesDial: MovesDial;
    private hasConcludedTurn: boolean = false;

    constructor(
        stage: Konva.Stage,
        endRivalTurnCallback: ((shiftMarket: boolean) => void) | null,
        localPlayerColor: PlayerColor | null,
        yOffset: number,
    ) {
        this.localPlayerColor = localPlayerColor,
        this.group = new Konva.Group({
            width: 250,
            height: 100,
            x: 50,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            stroke: HUES.Neutral,
            cornerRadius: 5,
            strokeWidth: 0,
        });

        this.influenceDial = new InfluenceDial(
            { x: -53, y: 25 },
            HUES.Neutral,
        );

        this.shiftMarketButton = new ShiftMarketButton(
            stage,
            { x: 25, y: 10 },
            endRivalTurnCallback ? () => {
                this.hasConcludedTurn = true;
                endRivalTurnCallback(true);
            } : null,
        );
        this.concludeButton = new ConcludeButton(
            stage,
            { x: 110, y: 32 },
            endRivalTurnCallback ? () => {
                this.hasConcludedTurn = true;
                endRivalTurnCallback(false);
            } : null,
        );

        this.movesDial = new MovesDial({ x: 80, y: 10 });
        this.group.add(...[
            this.background,
            this.influenceDial.getElement(),
            this.shiftMarketButton.getElement(),
            this.concludeButton.getElement(),
            this.movesDial.getElement(),
        ]);
    }

    public getElement() {
        return this.group;
    }

    public hideInfluence() {
        this.influenceDial.selfDestroy();
    }

    public update(rival: Rival) {
        if (!rival.isIncluded)
            return;

        const { isControllable, activePlayerColor, bearings, influence, moves } = rival;

        const mayConclude = this.localPlayerColor === activePlayerColor && isControllable && moves < 2;
        const mayShift = bearings.location === 'market' && mayConclude;

        activePlayerColor && this.background.stroke(isControllable
            ? PLAYER_HUES[activePlayerColor].vivid.light
            : HUES.boneWhite,
        );
        this.background.strokeWidth(isControllable ? 3 : 0);
        this.concludeButton.update({ isControllable, mayConclude });
        this.shiftMarketButton.update(mayShift);
        this.movesDial.update({ moves, isCurrent: activePlayerColor && isControllable });

        if (this.hasConcludedTurn) {
            this.hasConcludedTurn = false;
            this.influenceDial.simulateRoll(influence);
        } else {
            this.influenceDial.update({ value: influence });
        }
    }

    public disable() {
        this.concludeButton.disable();
        this.shiftMarketButton.disable();
    }
}