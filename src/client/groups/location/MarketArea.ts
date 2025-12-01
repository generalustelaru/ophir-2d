import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData, MarketUpdate } from '~/client_types';
import clientConstants from '~/client_constants';
import { MarketFluctuations, MarketSlotKey, MarketOffer, Action, Unique } from '~/shared_types';
import { MarketDeck, MarketCardSlot } from '.';

const { COLOR, LOCATION_TOKEN_DATA } = clientConstants;

export class MarketArea implements Unique<DynamicGroupInterface<MarketUpdate>> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private marketDeck: MarketDeck;
    private slot_1: MarketCardSlot;
    private slot_2: MarketCardSlot;
    private slot_3: MarketCardSlot;

    constructor(
        stage: Konva.Stage,
        marketFluctuations: MarketFluctuations,
        templeTradeSlot: MarketSlotKey,
        market: MarketOffer,
        layout: GroupLayoutData,
        defaultCallback: Function | null,
        peddlerCallback: Function | null,
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
            visible: false,
        });

        const leftmargin = 10;
        const totalHeight = this.group.height();
        const cardWidth = 66;

        this.marketDeck = new MarketDeck(
            stage,
            {
                width: cardWidth,
                height: totalHeight,
                x: 0,
                y: 0,
            },
            market,
            market.deckId,
        );

        const pickCallback = (slot: MarketSlotKey): Function | null =>  {
            if (peddlerCallback && marketFluctuations[slot] == -1)
                return peddlerCallback;
            return defaultCallback;
        };

        this.slot_1 = new MarketCardSlot(
            stage,
            {
                width: cardWidth,
                height: totalHeight,
                x: cardWidth + leftmargin,
                y: 0,
            },
            'slot_1',
            market.slot_1,
            marketFluctuations.slot_1,
            pickCallback('slot_1'),
        );

        this.slot_2 = new MarketCardSlot(
            stage,
            {
                width: cardWidth,
                height: totalHeight,
                x: cardWidth * 2 + leftmargin * 2,
                y: 0,
            },
            'slot_2',
            market.slot_2,
            marketFluctuations.slot_2,
            pickCallback('slot_2'),
        );

        this.slot_3 = new MarketCardSlot(
            stage,
            {
                width: cardWidth,
                height: totalHeight,
                x: cardWidth * 3 + leftmargin * 3,
                y: 0,
            },
            'slot_3',
            market.slot_3,
            marketFluctuations.slot_3,
            pickCallback('slot_3'),
        );

        const templeIcon = new Konva.Path({
            data: LOCATION_TOKEN_DATA.temple.shape,
            fill: LOCATION_TOKEN_DATA.temple.fill,
            x: this[templeTradeSlot].getElement().x() + cardWidth / 2 - 12,
            y: 0,
            scale: { x: 2, y: 2 },
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

    public update(data: MarketUpdate): void {
        this.marketDeck.update(data.marketOffer);

        const localPlayer = data.localPlayer;

        const localPLayerMaySell = !!(
            localPlayer?.isActive
            && localPlayer.isAnchored
            && localPlayer.locationActions.filter(
                a => [Action.sell_goods, Action.sell_as_chancellor].includes(a),
            ).length
        );

        const cardSlots: Array<MarketSlotKey> = ['slot_1', 'slot_2', 'slot_3'];

        cardSlots.forEach(slot => {
            const isFeasible =
                localPLayerMaySell
                && localPlayer.feasibleTrades.map(f => f.slot).includes(slot);
            this[slot].update({
                trade: data.marketOffer[slot],
                isFeasible,
            });
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public disable(): void {
        this.slot_1.disable();
        this.slot_2.disable();
        this.slot_3.disable();
    }
}
