import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import clientConstants from "../client_constants";
import { ResponsiveGroup } from "./ResponsiveGroup";
import { CoinDial } from "./CoinDial";

const { COLOR } = clientConstants;

export class UpgradeBox extends ResponsiveGroup implements DynamicGroupInterface<boolean> {

    private background: Konva.Rect;
    private plusSign: Konva.Text;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
        super(stage, layout, { action: 'upgrade', details: null });

        this.background = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: COLOR.upgradeBoxSilver,
            cornerRadius: 15,
        });

        const coin = new CoinDial({ x: 15, y: 20 }, 2);

        this.plusSign = new Konva.Text({
            x: 50,
            y: 5,
            text: '+',
            fontSize: 30,
            fontFamily: 'Calibri',
            fill: 'black',
        });

        const cargoIcon = new Konva.Rect({
            x: 45,
            y: 5,
            height: 30,
            width: 25,
            fill: COLOR.holdDarkRed,
            stroke: COLOR.stampEdge,
            hitStrokeWidth: 2,
            cornerRadius: 5,
            strokeWidth: 1,
        });

        this.group.add(
            this.background,
            coin.getElement(),
            cargoIcon,
            this.plusSign,
        );
    }

    public updateElement(canUpgrade: boolean): void {
        this.setEnabled(canUpgrade);
        this.background.fill(canUpgrade ? COLOR.boneWhite : COLOR.upgradeBoxSilver);
        this.plusSign.fill(canUpgrade ? COLOR.boneWhite : 'black');
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}