import Konva from "konva";
import { Coordinates, MetalId } from "../../../shared_types";
import { DynamicGroupInterface } from "../../client_types";
import { ActionButton } from "../ActionButton";
import clientConstants from "../../client_constants";

const { COLOR, ICON_DATA, CARGO_ITEM_DATA } = clientConstants;
export class TempleDonationCard extends ActionButton implements DynamicGroupInterface<boolean> {
    private background: Konva.Rect;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        metalType: MetalId,
        isEnabled: boolean,
    ) {
        super(
            stage,
            { x: position.x, y: position.y, width: 66, height: 96 },
            { action: 'donate_metals', payload: { metal: metalType } },
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

        const disc = new Konva.Circle({
            x: this.group.width() / 2,
            y: this.group.height() / 2 + 15,
            radius: 26,
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

        const Xbackdrift = metalType === 'gold' ? 20 : 9
        const vp = new Konva.Text({
            x: this.group.width() / 2 - Xbackdrift,
            y: this.group.height() / 2 - 3,
            text: metalType === 'gold' ? '10' : '5',
            fontSize: 40,
            fill: COLOR.boneWhite,
            stroke: 'black',
            strokeWidth: 2,
            fontFamily: 'Calibri',
        });

        this.group.add(...[
            this.background,
            metalIcon,
            disc,
            leftWreath,
            rightWreath,
            vp,
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