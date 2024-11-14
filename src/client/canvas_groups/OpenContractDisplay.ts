import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import { ContractCard } from "./CanvasGroups";
import { Contract } from "../../shared_types";

export class OpenContractDisplay implements DynamicGroupInterface<any>
{
    private group: Konva.Group;
    private contractCard: ContractCard;

    constructor(
        layout: GroupLayoutData,
        futureContract: Contract,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        const segmentHeight = this.group.height() / 6;

        this.contractCard = new ContractCard(
            {
                width: this.group.width(),
                height: segmentHeight * 4,
                x: 0,
                y: segmentHeight,
            },
            futureContract,
        );

        this.group.add(
            this.contractCard.getElement()
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(arg: any): void {
        console.log(arg);
    }
}