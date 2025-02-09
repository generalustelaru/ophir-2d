import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { MarketCard } from "../GroupList";
import { MarketDeckKey, MarketOffer } from "../../../shared_types";

export class MarketDeck implements DynamicGroupInterface<MarketOffer>
{
    private group: Konva.Group;
    private marketCard: MarketCard;
    private deckInUse: Konva.Text;
    private cardY: number;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        offer: MarketOffer,
        deckId: MarketDeckKey,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        this.cardY = this.group.height() / 6;
        this.marketCard = new MarketCard(
            stage,
            { x: 0, y: this.cardY - offer.deckSize },
            null,
            offer.future,
        );

        const deckEffect = new Konva.Rect({
            width: this.marketCard.getElement().width(),
            height: this.marketCard.getElement().height(),
            x: this.marketCard.getElement().x(),
            y: this.cardY,
            fill: 'gray',
            stroke: 'gray',
            strokeWidth: 2,
            cornerRadius: 15,
        })

        this.deckInUse = new Konva.Text({
            x: deckEffect.x() + 5,
            y: deckEffect.y() + deckEffect.height() + 2,
            text: deckId,
            fontSize: 20,
            fontFamily: 'Calibri',
            fill: 'white',
        });

        this.group.add(
            deckEffect,
            this.marketCard.getElement(),
            this.deckInUse,
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(offer: MarketOffer): void {
        this.marketCard.update({trade: offer.future, isFeasible: false});
        this.deckInUse.text(offer.deckId);
        this.marketCard.getElement().y(this.cardY - offer.deckSize);
    }
}