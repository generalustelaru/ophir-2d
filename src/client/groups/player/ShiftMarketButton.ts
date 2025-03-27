import { DynamicGroupInterface } from "../../client_types";
import { ActionButton } from "../ActionButton";
import clientConstants from "../../client_constants";
import Konva from "konva";
import { Action, Coordinates } from "../../../shared_types";

const { COLOR } = clientConstants;

export class ShiftMarketButton extends ActionButton implements DynamicGroupInterface<boolean> {

    private card: Konva.Rect;
    private coin: Konva.Circle;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
    ) {
        super(
            stage,
            { x: position.x, y: position.y, width: 50, height: 81 },
            { action: Action.shift_market, payload: null },
        );

        this.card = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.marketDarkOrange,
            cornerRadius: 11,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
        });

        this.coin = new Konva.Circle({
            x: this.group.width() / 2,
            y: this.group.height() / 3 * 2,
            radius: 15,
            border: 1,
            borderFill: 'black',
            fill: COLOR.coinSilver,
        });

        this.group.add(...[
            this.card,
            this.coin,
        ]);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    update(mayShift: boolean) {
        this.card.fill(mayShift ? COLOR.marketOrange : COLOR.marketDarkOrange)
        this.setEnabled(mayShift);
    }
}