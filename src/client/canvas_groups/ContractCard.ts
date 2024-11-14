import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import { Contract } from "../../shared_types";
import { CoinDial } from "./CanvasGroups";
import clientConstants from "../client_constants";

const { COLOR } = clientConstants;
export class ContractCard implements DynamicGroupInterface<Contract> {

    private group: Konva.Group;
    private coinDial: CoinDial;
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

        this.coinDial = new CoinDial(contract.reward.coins);
        const cardBorder = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.boneWhite,
            cornerRadius: 15,
        });
        const cardInterior = new Konva.Rect({
            width: this.group.width() - 10,
            height: this.group.height() - 10,
            x: 5,
            y: 5,
            fill: COLOR.wood,
            cornerRadius: 15,
        });

        this.group.add(
            cardBorder,
            cardInterior,
            this.coinDial.getElement(),
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