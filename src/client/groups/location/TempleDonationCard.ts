import Konva from "konva";
import { Action, Coordinates, Metal } from "~/shared_types";
import { DynamicGroupInterface } from "~/client_types";
import { ActionButton } from "../ActionButton";
import clientConstants from "~/client_constants";
import { VictoryPointDial } from "../VictoryPointDial";

const { COLOR, CARGO_ITEM_DATA } = clientConstants;
export class TempleDonationCard extends ActionButton implements DynamicGroupInterface<boolean> {
    private background: Konva.Rect;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        metalType: Metal,
        isEnabled: boolean,
    ) {
        super(
            stage,
            { x: position.x, y: position.y, width: 66, height: 96 },
            { action: Action.donate_metals, payload: { metal: metalType } },
        );

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: isEnabled ? COLOR.templeBlue : COLOR.templeDarkBlue,
            stroke: isEnabled ? COLOR.treasuryGold : COLOR.boneWhite,
            strokeWidth: 2,
            cornerRadius: 15,
        });

        const metalIcon = new Konva.Path({
            data: CARGO_ITEM_DATA[metalType].shape,
            fill: CARGO_ITEM_DATA[metalType].fill,
            x: 1,
            y: 5,
            scaleX: 2.75,
            scaleY: 2.75,
        });

        const vpDial = new VictoryPointDial(
            {x: 0, y: 0},
            metalType === 'gold' ? 10 : 5,
        );

        this.group.add(...[
            this.background,
            metalIcon,
            vpDial.getElement(),
        ]);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(canDonate: boolean): void {
        this.setEnabled(canDonate);
        this.background.fill(canDonate ? COLOR.templeBlue : COLOR.templeDarkBlue);
    }
}