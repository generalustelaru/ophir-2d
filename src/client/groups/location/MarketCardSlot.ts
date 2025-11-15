import Konva from 'konva';
import { MarketCardUpdate, DynamicGroupInterface, GroupLayoutData } from '~/client_types';
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
        tradeCallback: Function,
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
            () => tradeCallback(marketKey),
            trade,
            fluctuation,
        );

        this.group.add(this.marketCard.getElement());

        if (!!fluctuation)
            this.group.add(this.getFluctuationSymbol(fluctuation));
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(data: MarketCardUpdate): void {
        this.marketCard.update(data);
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
            x: 5,
            y: this.group.height() - 48,
        });
    }

    public disable(): void {
        this.marketCard.disable();
    }
}