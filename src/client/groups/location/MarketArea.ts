import Konva from 'konva';
import { DynamicGroupInterface, Flashable, GroupLayoutData, MarketUpdate } from '~/client_types';
import clientConstants from '~/client_constants';
import { MarketFluctuations, MarketSlotKey, MarketState, Action, Unique } from '~/shared_types';
import { MarketDeck, MarketCardSlot } from '.';
import { fade } from '~/client/animations';

const { HUES, LOCATION_TOKEN_DATA } = clientConstants;

export class MarketArea implements Unique<DynamicGroupInterface<MarketUpdate>>, Unique<Flashable> {

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
        market: MarketState,
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

        const leftmargin = 10;
        const totalHeight = this.group.height();
        const cardWidth = 66;
        const cardPad = 8;

        this.background = new Konva.Rect({
            x: cardWidth + leftmargin,
            y: totalHeight / 6 - cardPad,
            width: this.group.width() - cardWidth - leftmargin,
            height: 108 + cardPad * 2,
            fill: HUES.marketDarkOrange,
            cornerRadius: 10,
            opacity: 0,
        });

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
            false,
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
            false,
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
            false,
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
            true,
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
            templeIcon,
            this.slot_3.getElement(),
            this.slot_2.getElement(),
            this.slot_1.getElement(),
            this.marketDeck.getElement(),
        );
    }

    public update(data: MarketUpdate): void {
        const { market, localPlayer, isShift } = data;

        this.marketDeck.update({ market, isShift });

        const localPlayerMaySell = !!(
            localPlayer?.isCurrent
            && localPlayer.isAnchored
            && localPlayer.locationActions.filter(
                a => [Action.trade_commodities, Action.trade_as_chancellor].includes(a),
            ).length
        );

        const cardSlots: Array<MarketSlotKey> = ['slot_1', 'slot_2', 'slot_3'];

        cardSlots.forEach(slot => {
            const isFeasible =
                localPlayerMaySell
                && !!localPlayer.feasibleTrades.find(f => f.slot == slot);
            this[slot].update({ isShift, trade: market[slot], isFeasible });
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public async flash(): Promise<void> {
        this.background.opacity(1);
        await fade(this.background, 0.6, 0);
    }

    public disable(): void {
        this.slot_1.disable();
        this.slot_2.disable();
        this.slot_3.disable();
    }
}
