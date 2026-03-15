import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { MarketCard } from '.';
import { MarketDeckKey, MarketState, Unique } from '~/shared_types';
import clientConstants from '~/client/client_constants';

type Update = {
    isShift: boolean
    market: MarketState
}
const { HUES, LOCATION_TOKEN_DATA } = clientConstants;
export class MarketDeck implements Unique<DynamicGroupInterface<Update>>
{
    private group: Konva.Group;
    private marketCard: MarketCard;
    private cardBackDesign: Konva.Group;
    private deckInfo: Konva.Text;
    private cardY: number;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        offer: MarketState,
        deckId: MarketDeckKey,
        shouldFade: boolean,
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
            shouldFade,
        );

        const cardLayout = (() => {
            const element = this.marketCard.getElement();
            return {
                width: element.width(),
                height: element.height(),
                x: element.x(),
                y: element.y(),
            };
        })();

        const cardBack = new Konva.Rect({
            width: cardLayout.width,
            height: cardLayout.height,
            fill: HUES.marketDarkOrange,
            cornerRadius: 15,
            stroke: HUES.darkerSilver,
            strokeWidth: 2,
        });
        const circle = new Konva.Circle({
            fill: HUES.marketOrange,
            radius: 25,
            x: cardLayout.width / 2,
            y: cardLayout.height / 2,
        });
        const pathData = LOCATION_TOKEN_DATA.market;
        const marketIcon = new Konva.Path({
            data: pathData.shape,
            fill: pathData.fill,
            x: 18,
            y: 35,
            scale: { x: 2.5, y: 2.5 },
        });

        this.cardBackDesign = new Konva.Group({ ...cardLayout }).add(cardBack, circle, marketIcon);

        const deckEffect = new Konva.Rect({
            ...cardLayout,
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
            fill: HUES.boneWhite,
        });

        this.group.add(
            deckEffect,
            this.cardBackDesign,
            this.marketCard.getElement(),
            this.deckInfo,
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public async update(data: Update): Promise<void> {
        const { market, isShift } = data;
        const { future, deckId, deckSize } = market;

        await this.marketCard.update({ trade: future, isFeasible: false, isShift });

        this.deckInfo.text(`+${deckSize}(${deckId})`);
        this.marketCard.getElement().y(this.cardY - deckSize);
        this.cardBackDesign.y(this.cardY - deckSize);
    }
}