// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from 'konva';
import { DynamicGroupInterface, Unique } from '~/client_types';
import { PlayerColor, Rival } from '~/shared_types';
import { InfluenceDial, MovesDial } from '../popular';
import { ShiftMarketButton, ConcludeButton } from '.';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;

export class RivalPlacard implements Unique<DynamicGroupInterface<Rival>> {

    private localPlayerColor: PlayerColor | null;
    private group: Konva.Group;
    private background: Konva.Rect;
    private influenceDial: InfluenceDial;
    private shiftMarketButton: ShiftMarketButton;
    private concludeButton: ConcludeButton;
    private movesDial: MovesDial;

    constructor(
        stage: Konva.Stage,
        endRivalTurnCallback: (p: boolean) => void,
        localPlayerColor: PlayerColor | null,
        rival: Rival,
        yOffset: number,
    ) {
        this.localPlayerColor = localPlayerColor,
        this.group = new Konva.Group({
            width: 250,
            height: 100,
            x: 25,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            stroke: COLOR.boneWhite,
            cornerRadius: 5,
            strokeWidth: 0,
        });

        this.influenceDial = new InfluenceDial(
            { x: -55, y: 25 },
            COLOR.boneWhite,
        );

        this.shiftMarketButton = new ShiftMarketButton(
            stage,
            { x: 25, y: 10 },
            () => endRivalTurnCallback(true),
        );
        this.concludeButton = new ConcludeButton(
            stage,
            { x: 100, y: 25 },
            () => endRivalTurnCallback(false),
        );
        this.movesDial = new MovesDial({ x:80, y:10 });

        this.group.add(...[
            this.background,
            this.influenceDial.getElement(),
            this.shiftMarketButton.getElement(),
            this.concludeButton.getElement(),
            this.movesDial.getElement(),
        ]);

        this.update(rival);
    }

    public getElement() {
        return this.group;
    }

    public update(rival: Rival) {
        if (!rival.isIncluded)
            return;

        const { isControllable, activePlayerColor, bearings, influence, moves } = rival;

        const mayConclude = this.localPlayerColor === activePlayerColor && isControllable && moves < 2;
        const mayShift = bearings.location === 'market' && mayConclude;

        activePlayerColor && this.background.stroke(isControllable ? COLOR[activePlayerColor] : COLOR.boneWhite);
        this.background.strokeWidth(isControllable ? 3 : 0);
        this.influenceDial.update({ value: influence, color: null });
        this.concludeButton.update({ isControllable, mayConclude });
        this.shiftMarketButton.update(mayShift);
        this.movesDial.update({ moves, isActive: activePlayerColor && isControllable });
    }
}