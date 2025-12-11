import Konva from 'konva';
import { Coordinates, Unique } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import clientConstants from '~/client_constants';

const { HUES, ICON_DATA } = clientConstants;

export class MiniTempleRewardDial implements Unique<DynamicGroupInterface<number>> {
    private group: Konva.Group;
    private amount: Konva.Text;
    constructor(
        position: Coordinates,
        amount: number,
    ) {

        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
            width: 20,
            height: 20,
        });

        const redCircle = new Konva.Circle({
            x: 0,
            y: 0,
            radius: this.group.width() / 2,
            fill: ICON_DATA.favor_stamp_inner.fill,
            stroke: HUES.templeDarkBlue,
            strokeWidth: 1,
        });

        const goldSemiDisc = new Konva.Wedge({
            x: 0,
            y: 0,
            radius: this.group.width() / 2,
            angle: 180,
            rotation: 90,
            fill: HUES.vpGold,
        });

        this.amount  = new Konva.Text({
            x: - 5,
            y: - 10,
            text: amount.toString(),
            fontSize: 20,
            fill: 'black',
            stroke: 'black',
            strokeWidth: 1,
            fontFamily: 'Calibri',
        });

        this.group.add(redCircle, goldSemiDisc, this.amount);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(state: number): void {
        this.amount.text(state.toString());
    }
}