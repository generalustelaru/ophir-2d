import Konva from 'konva';
import { DynamicGroupInterface } from "~/client_types";
import { Coordinates } from "~/shared_types";
import { FavorIcon } from '../FavorIcon';
import clientConstants from "~/client_constants";

const { ICON_DATA, COLOR } = clientConstants;

export class TempleRewardDial implements DynamicGroupInterface<number> {
    private group: Konva.Group;
    private amount: Konva.Text;
    constructor(
        position: Coordinates,
        amount: number,
    ) {
        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
            // width: 66, height: 96,
        });

        const favorIcon = new FavorIcon({ x: -20, y: -23, width: 0, height: 0 }, 1.8);

        const semiDisc = new Konva.Wedge({
            y: -1,
            radius: 22,
            angle: 180,
            fill: COLOR.vpGold,
            rotation: 90,
        });

        const semiWreath = new Konva.Path({
            data: ICON_DATA.half_wreath.shape,
            fill: ICON_DATA.half_wreath.fill,
            x: -27,
            y: -24,
            scale: { x: 2, y: 2 },
        });

        const coinCenter = this.group.getClientRect().width / 2;
        this.amount = new Konva.Text({
            x: coinCenter - 9,
            y: coinCenter - 20,
            text: amount.toString(),
            fontSize: 20,
            fill: COLOR.modalBlue,
            stroke: COLOR.modalBlue,
            // strokeWidth: 2,
            fontFamily: 'Calibri',
        });

        this.group.add(...[
            favorIcon.getElement(),
            semiDisc,
            semiWreath,
            this.amount
        ]);
    }

    public getDiameter(): number {
        return this.group.width();
    }

    public getElement(): Konva.Group {
        return this.group;
    }
    
    public update(value: number): void {
        this.amount.text(value.toString());
    }
}