import { DynamicGroupInterface } from "../../client_types";
import { ActionButton } from "../ActionButton";
import clientConstants from "../../client_constants";
import Konva from "konva";

const { LAYERED_ICONS, COLOR } = clientConstants;
const SCALE = 5;
export class ShiftMarketButton extends ActionButton implements DynamicGroupInterface<boolean> {

    constructor(
        stage: Konva.Stage
    ) {
        super(
            stage,
            { x: 0, y: 0, width: 100, height: 100 },
            null,
        );

        this.group = new Konva.Group;
        this.group.offsetX(75);
        this.group.offsetY(125);

        const pathData = LAYERED_ICONS.shift_market_button;

        const card = new Konva.Path({
            data: pathData.layer_1.shape,
            fill: pathData.layer_1.fill,
            scale: { x: SCALE, y: SCALE },
            // stroke: COLOR.marketOrange,
            // strokeWidth: 0.2,
        });
        const coin = new Konva.Path({
            data: pathData.layer_2.shape,
            fill: pathData.layer_2.fill,
            scale: { x: SCALE, y: SCALE },
        });
        // const arrow = new Konva.Path({
        //     data: pathData.layer_3?.shape,
        //     fill: pathData.layer_3?.fill,
        //     scale: { x: SCALE, y: SCALE },
        //     stroke: COLOR.marketOrange,
        //     strokeWidth: 0.2,
        // });
        this.group.add(card, coin);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    update(isVisible: boolean) {
        this.group.visible(isVisible);
    }
}