// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { PlayerColor, Rival } from '~/shared_types';
import { InfluenceDial } from '../GroupList';
import { ShiftMarketButton } from './ShiftMarketButton';
import clientConstants from '~/client_constants';
import { ConcludeButton } from './ConcludeButton';

const { COLOR } = clientConstants;

export class RivalPlacard implements DynamicGroupInterface<Rival> {

    private localPlayerColor: PlayerColor | null;
    private group: Konva.Group;
    private background: Konva.Rect;
    private influenceDial: InfluenceDial;
    private shiftMarketButton: ShiftMarketButton;
    private concludeButton: ConcludeButton;

    constructor(
        stage: Konva.Stage,
        localPlayerColor: PlayerColor | null,
        rival: Rival,
        yOffset: number,
    ) {
        this.localPlayerColor = localPlayerColor,
        this.group = new Konva.Group({
            width: 100,
            height: 100,
            x: 50,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            stroke: COLOR.boneWhite,
            fill: COLOR.boneWhite,
            cornerRadius: 15,
            strokeWidth: 0,
        });

        this.influenceDial = new InfluenceDial(
            { width: 50, height: 50, x: 60, y: -25 },
            COLOR.boneWhite,
        );

        this.shiftMarketButton = new ShiftMarketButton(stage, { x: 25, y: 10 });
        this.concludeButton = new ConcludeButton(stage, { x: this.group.width() + 25, y: 25 });

        this.group.add(...[
            this.background,
            this.influenceDial.getElement(),
            this.shiftMarketButton.getElement(),
            this.concludeButton.getElement(),
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

        activePlayerColor && this.background.fill(isControllable ? COLOR[activePlayerColor] : COLOR.boneWhite);
        this.background.strokeWidth(isControllable ? 3 : 0);
        this.influenceDial.update(influence);
        this.concludeButton.update({ isControllable, mayConclude });
        this.shiftMarketButton.update(mayShift);
    }
}