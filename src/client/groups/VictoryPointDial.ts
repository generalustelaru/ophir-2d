import Konva from "konva";
import { DynamicGroupInterface } from "~/client_types";
import { Coordinates } from "~/shared_types";
import clientConstants from "~/client_constants";

const { COLOR, ICON_DATA } = clientConstants;
export class VictoryPointDial implements DynamicGroupInterface<number> {

    private group: Konva.Group;
    private vp: Konva.Text;
    constructor(
        position: Coordinates,
        value?: number,
    ) {
        this.group = new Konva.Group({
            x: position.x, y: position.y, width: 66, height: 96
        });

        const disc = new Konva.Circle({
            x: this.group.width() / 2,
            y: this.group.height() / 2 + 15,
            radius: 22,
            fill: COLOR.vpGold,
        });

        const wreathY = this.group.height() / 2 - 6;
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

        const backdrift = value && value > 9 ? 10 : 5
        this.vp = new Konva.Text({
            x: this.group.width() / 2 - backdrift,
            y: this.group.height() / 2 + 5,
            text: value ? String(value) : '0',
            fontSize: 20,
            fill: COLOR.vpCardPurple,
            stroke: COLOR.vpCardPurple,
            // strokeWidth: 2,
            fontFamily: 'Calibri',
        });

        this.group.add(...[
            disc,
            leftWreath,
            rightWreath,
            this.vp,
        ]);
    }

    public update(value: number) {
        const backdrift = value > 9 ? 10 : 5;
        this.vp.x(this.group.width() / 2 - backdrift)
        this.vp.text(String(value));
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}
