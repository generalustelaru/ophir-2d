import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import clientConstants from '~/client_constants';

const { HUES, ICON_DATA } = clientConstants;
export class VictoryPointDial implements Unique<DynamicGroupInterface<number>> {

    private group: Konva.Group;
    private vp: Konva.Text;
    constructor(
        position: Coordinates,
        value?: number,
        isVisible: boolean = true,
    ) {
        this.group = new Konva.Group({
            x: position.x, y: position.y, width: 66, height: 66 },
        ).visible(isVisible);

        const disc = new Konva.Circle({
            x: this.group.width() / 2,
            y: this.group.height() / 2,
            radius: 22,
            fill: HUES.vpGold,
        });

        const wreathY = 12;
        const wreathX = 6;

        const leftWreath = new Konva.Path({
            data: ICON_DATA.half_wreath.shape,
            fill: ICON_DATA.half_wreath.fill,
            x: wreathX,
            y: wreathY,
            scale: { x: 2, y: 2 },
        });

        const rightWreath = new Konva.Path({
            data: ICON_DATA.half_wreath.shape,
            fill: ICON_DATA.half_wreath.fill,
            x: wreathX + 27 * 2,
            y: wreathY,
            scale: { x: -2, y: 2 },
        });

        this.vp = new Konva.Text({
            width: this.group.width(),
            height: this.group.height(),
            align: 'center',
            verticalAlign: 'middle',
            text: value ? String(value) : '0',
            fontSize: 20,
            fill: HUES.vpCardPurple,
            stroke: HUES.vpCardPurple,
            fontFamily: 'Calibri',
        });

        this.group.add(...[
            disc,
            leftWreath,
            rightWreath,
            this.vp,
        ]);
    }

    public appear() {
        this.group.visible(true);
    }

    public update(value: number) {
        this.vp.text(String(value));
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}
