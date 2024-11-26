import Konva from "konva";
import { MarketCardUpdate, DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { MarketCard } from "../GroupList";
import { Trade, Fluctuation, MarketKey } from "../../../shared_types";
import clientConstants from "../../client_constants";

const { ICON_DATA } = clientConstants;

export class MarketCardSlot implements DynamicGroupInterface<MarketCardUpdate> {
    private group: Konva.Group;
    private marketCard: MarketCard;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        marketKey: MarketKey,
        trade: Trade,
        fluctuation: Fluctuation,
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
            { action: 'sell_goods', details: { slot: marketKey } },
            trade,
            fluctuation
        );

        const fluctuationSymbol = this.getFluctuationSymbol(fluctuation);

        this.group.add(
            this.marketCard.getElement(),
            fluctuationSymbol
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(data: MarketCardUpdate): void {
        this.marketCard.updateElement(data);
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
        }

        return new Konva.Path({
            data: data().shape,
            fill: data().fill,
            scale: { x: 3, y: 3 },
            x: this.group.width() / 2 - 12,
            y: this.group.height() - this.group.height() / 6 - 10,
        });
    }
}