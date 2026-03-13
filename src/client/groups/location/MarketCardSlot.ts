import Konva from 'konva';
import { MarketCardUpdate, DynamicGroupInterface, GroupLayoutData, ElementList } from '~/client_types';
import { MarketCard } from '.';
import { Trade, Fluctuation, MarketSlotKey, Unique } from '~/shared_types';
import clientConstants from '~/client_constants';

const { ICON_DATA } = clientConstants;

export class MarketCardSlot implements Unique<DynamicGroupInterface<MarketCardUpdate>> {
    private group: Konva.Group;
    private marketCard: MarketCard;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        marketKey: MarketSlotKey,
        trade: Trade,
        fluctuation: Fluctuation,
        tradeCallback: Function | null,
        shouldFade: boolean,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        const segmentHeight = this.group.height() / 6;
        this.marketCard = new MarketCard(
            stage,
            { x: 0, y: segmentHeight },
            tradeCallback ? () => tradeCallback(marketKey) : null,
            trade,
            fluctuation,
            shouldFade,
        );
        const elements: ElementList = [this.marketCard.getElement()];

        if (!!fluctuation) {
            elements.push(this.getFluctuationSymbol(fluctuation));
        }

        this.group.add(...elements);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(data: MarketCardUpdate): void {
        this.marketCard.update(data);
    }

    public disable(): void {
        this.marketCard.disable();
    }

    private getFluctuationSymbol(fluctuation: Fluctuation): Konva.Path {

        const data = () => {
            switch (fluctuation) {
                case 1:
                    return ICON_DATA.fluctuation_arrow_up;
                case -1:
                    return ICON_DATA.fluctuation_arrow_down;
                case 0:
                    return ICON_DATA.no_fluctuation_dash;
            }
        };

        return new Konva.Path({
            data: data().shape,
            fill: data().fill,
            stroke: 'black',
            strokeWidth: 1,
            scale: { x: 2, y: 2 },
            x: 24,
            y: 5,
        });
    }
}
