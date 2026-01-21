import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { MarketCard } from '.';
import { MarketDeckKey, MarketOffer, Unique } from '~/shared_types';

export class MarketDeck implements Unique<DynamicGroupInterface<MarketOffer>>
{
    private group: Konva.Group;
    private marketCard: MarketCard;
    private deckInfo: Konva.Text;
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
            null,
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
        });

        this.deckInfo = new Konva.Text({
            x: deckEffect.x() + 5,
            y: deckEffect.y() + deckEffect.height() + 2,
            text: deckId,
            fontSize: 14,
            fontFamily: 'Custom',
            fill: 'pink',
        });

        this.group.add(
            deckEffect,
            this.marketCard.getElement(),
            this.deckInfo,
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(offer: MarketOffer): void {
        const { future, deckId, deckSize } = offer;
        this.marketCard.update({ trade: future, isFeasible: false });
        this.deckInfo.text(`+${deckSize}(${deckId})`);
        this.marketCard.getElement().y(this.cardY - deckSize);
    }
}