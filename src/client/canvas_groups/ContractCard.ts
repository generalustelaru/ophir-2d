import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import { Contract } from "../../shared_types";
import { CoinDial } from "./CanvasGroups";
import clientConstants from "../client_constants";

const { COLOR } = clientConstants;
export class ContractCard implements DynamicGroupInterface<Contract> {

    private group: Konva.Group;
    private coinDial: CoinDial;
    private cargoDisplay: Konva.Group;
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

        this.cargoDisplay = new Konva.Group({
            width: cardInterior.width(),
            height: cardInterior.height() - this.coinDial.getElement().height() - this.coinDial.getElement().y() - 20,
            x: cardInterior.x(),
            y: this.coinDial.getElement().y() + this.coinDial.getElement().height() + 10,
        });
        const testRect = new Konva.Rect({
            width: this.cargoDisplay.width(),
            height: this.cargoDisplay.height(),
            fill: 'red',
        });

        this.cargoDisplay.add(
            testRect
        );

        this.group.add(
            cardBorder,
            cardInterior,
            this.coinDial.getElement(),
            this.cargoDisplay,
        );
    }

    public updateElement(contract: Contract): void {
        console.log(contract);
        this.coinDial.updateElement(contract.reward.coins);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}