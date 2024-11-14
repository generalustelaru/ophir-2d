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
            y: layout.y,
        });

        this.contractCard = new ContractCard(
            {
                width: this.group.width(),
                height: this.group.height(),
                x: this.group.x(),
                y: this.group.y(),
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