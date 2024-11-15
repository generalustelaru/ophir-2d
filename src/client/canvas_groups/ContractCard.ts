import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import { Contract } from "../../shared_types";
import { CoinDial, GoodsOrderDisplay } from "./CanvasGroups";
import clientConstants from "../client_constants";

const { COLOR } = clientConstants;
export class ContractCard implements DynamicGroupInterface<Contract> {

    private group: Konva.Group;
    private coinDial: CoinDial;
    private goodsDisplay: GoodsOrderDisplay;
    constructor(
        layout: GroupLayoutData,
        contract: Contract,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        const cardBorder = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.boneWhite,
            cornerRadius: 15,
        });

        const cardInterior = new Konva.Rect({
            width: this.group.width() - 6,
            height: this.group.height() - 6,
            x: 3,
            y: 3,
            fill: COLOR.wood,
            cornerRadius: 15,
        });

        this.coinDial = new CoinDial(
            {x: 38, y: 35 },
            contract.reward.coins
        );

        this.goodsDisplay = new GoodsOrderDisplay(
            {
                width: cardInterior.width(),
                height: cardInterior.height() - this.coinDial.getElement().height() - this.coinDial.getElement().y() - 20,
                x: cardInterior.x(),
                y: this.coinDial.getElement().y() + this.coinDial.getElement().height() + 10,
            },
            contract.request
        );

        this.group.add(
            cardBorder,
            cardInterior,
            this.coinDial.getElement(),
            this.goodsDisplay.getElement(),
        );
    }

    public updateElement(contract: Contract): void {
        this.coinDial.updateElement(contract.reward.coins);
        this.goodsDisplay.updateElement(contract.request);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}