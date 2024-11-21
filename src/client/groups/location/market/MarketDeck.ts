import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../../../client_types";
import { MarketCard } from "../../GroupList";
import { TradeOffer } from "../../../../shared_types";

export class MarketDeck implements DynamicGroupInterface<TradeOffer>
{
    private group: Konva.Group;
    private contractCard: MarketCard;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        futureContract: TradeOffer,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y - 20,
        });

        const segmentHeight = this.group.height() / 6;

        this.contractCard = new MarketCard(
            stage,
            {
                width: this.group.width(),
                height: segmentHeight * 4,
                x: 0,
                y: segmentHeight,
            },
            null,
            futureContract,
        );

        const deck = new Konva.Rect({
            width: this.contractCard.getElement().width() - 6,
            height: 50,
            x: this.contractCard.getElement().x() + 3,
            y: this.contractCard.getElement().y() + this.contractCard.getElement().height() - 30,
            fill: 'gray',
            stroke: 'gray',
            strokeWidth: 2,
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

    public updateElement(contract: TradeOffer): void {
        this.contractCard.updateElement({contract: contract, isFeasible: false});
    }
}