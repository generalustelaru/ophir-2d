import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData, MarketUpdate } from "../../client_types";
import clientConstants from "../../client_constants";
import { MarketFluctuations, MarketKey, MarketOffer } from "../../../shared_types";
import { MarketDeck, MarketCardSlot } from "../GroupList";

const { COLOR, LOCATION_TOKEN_DATA } = clientConstants;

export class MarketPlacard implements DynamicGroupInterface<MarketUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private marketDeck: MarketDeck;
    private slot_1: MarketCardSlot;
    private slot_2: MarketCardSlot;
    private slot_3: MarketCardSlot;

    constructor(
        stage: Konva.Stage,
        marketFluctuations: MarketFluctuations,
        templeTradeSlot: MarketKey,
        market: MarketOffer,
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.marketDarkOrange,
            cornerRadius: 10,
        });

        const totalHeight = this.group.height();
        const cardWidth = this.group.width() / 4;

        this.marketDeck = new MarketDeck(
            stage,
            {
                width: cardWidth,
                height: totalHeight,
                x: 0,
                y: 0,
            },
            market.future,
            market.deckId,
        );

        this.slot_1 = new MarketCardSlot(
            stage,
            {
                width: cardWidth,
                height: totalHeight,
                x: cardWidth,
                y: 0,
            },
            'slot_1',
            market.slot_1,
            marketFluctuations.slot_1,
        );

        this.slot_2 = new MarketCardSlot(
            stage,
            {
                width: cardWidth,
                height: totalHeight,
                x: cardWidth * 2,
                y: 0,
            },
            'slot_2',
            market.slot_2,
            marketFluctuations.slot_2,
        );

        this.slot_3 = new MarketCardSlot(
            stage,
            {
                width: cardWidth,
                height: totalHeight,
                x: cardWidth * 3,
                y: 0,
            },
            'slot_3',
            market.slot_3,
            marketFluctuations.slot_3,
        );

        const templeIcon = new Konva.Path({
            data: LOCATION_TOKEN_DATA.temple.shape,
            fill: LOCATION_TOKEN_DATA.temple.fill,
            x: this[templeTradeSlot].getElement().x() + cardWidth / 2 - 12,
            y: 5,
        });

        this.group.add(
            this.background,
            this.marketDeck.getElement(),
            this.slot_1.getElement(),
            this.slot_2.getElement(),
            this.slot_3.getElement(),
            templeIcon,
        );
    }

    public updateElement(data: MarketUpdate): void {
        this.marketDeck.updateElement(data.marketOffer);

        const localPlayer = data.localPlayer;

        const localPLayerMaySell = !!(
            localPlayer?.isActive
            && localPlayer?.isAnchored
            && localPlayer?.locationActions?.includes('sell_goods')
        )

        const cardSlots: Array<MarketKey> = ['slot_1', 'slot_2', 'slot_3'];

        cardSlots.forEach(slot => {
            const isFeasible = localPLayerMaySell && localPlayer.feasibleTrades.includes(slot)
            this[slot].updateElement({
                trade: data.marketOffer[slot],
                isFeasible,
            });
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}
