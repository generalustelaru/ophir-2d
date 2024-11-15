import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import { ContractCard } from "./CanvasGroups";
import { Contract } from "../../shared_types";

export class FutureContractDisplay implements DynamicGroupInterface<any>
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
            y: layout.y - 20,
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

        const deck = new Konva.Rect({
            width: this.contractCard.getElement().width(),
            height: 50,
            x: this.contractCard.getElement().x(),
            y: this.contractCard.getElement().y() + this.contractCard.getElement().height() - 30,
            fill: 'black',
            cornerRadius: 15,
        })

        this.group.add(
            deck,
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