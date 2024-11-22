import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { MarketCard } from "../GroupList";
import { MarketDeckId, MarketOffer, Trade } from "../../../shared_types";

export class MarketDeck implements DynamicGroupInterface<MarketOffer>
{
    private group: Konva.Group;
    private marketCard: MarketCard;
    private deckInUse: Konva.Text;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        futureTrade: Trade,
        deckId: MarketDeckId,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y - 20,
        });

        const segmentHeight = this.group.height() / 6;

        this.marketCard = new MarketCard(
            stage,
            {
                width: this.group.width(),
                height: segmentHeight * 4,
                x: 0,
                y: segmentHeight,
            },
            null,
            futureTrade,
        );

        const deck = new Konva.Rect({
            width: this.marketCard.getElement().width() - 6,
            height: 50,
            x: this.marketCard.getElement().x() + 3,
            y: this.marketCard.getElement().y() + this.marketCard.getElement().height() - 30,
            fill: 'gray',
            stroke: 'gray',
            strokeWidth: 2,
            cornerRadius: 15,
        })

        this.deckInUse = new Konva.Text({
            x: deck.x() + 5,
            y: deck.y() + 0,
            text: deckId,
            fontSize: 20,
            fontFamily: 'Calibri',
            fill: 'white',
        });

        this.group.add(
            deck,
            this.marketCard.getElement(),
            this.deckInUse,
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(offer: MarketOffer): void {
        this.marketCard.updateElement({trade: offer.future, isFeasible: false});
        this.deckInUse.text(offer.deckId);
    }
}