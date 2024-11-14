import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import clientConstants from "../client_constants";
import { HexId, MarketFluctuations, MarketOffer } from "../../shared_types";
import { FutureContractDisplay } from "./CanvasGroups";

const { COLOR } = clientConstants;

export class MarketCard implements DynamicGroupInterface<HexId> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private marketLocation: HexId;
    private fluctuations: MarketFluctuations;
    private market: MarketOffer;
    private futureDisplay: FutureContractDisplay;

    constructor(
        location: HexId,
        marketFluctuations: MarketFluctuations,
        market: MarketOffer,
        layout: GroupLayoutData,
    ) {
        this.marketLocation = location;
        this.fluctuations = marketFluctuations;
        this.market = market;

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
            cornerRadius: 15,
        });

        const contractCardWidth = this.group.width() / 4;
        const contractCardHeight = (this.group.height() / 6) * 4;

        this.futureDisplay = new FutureContractDisplay({
                width: contractCardWidth,
                height: contractCardHeight,
                x: 0,
                y: 0,
            },
            this.market.future,
        );

        console.log(this.fluctuations);
        console.log(this.market);

        this.group.add(
            this.background,
            this.futureDisplay.getElement(),
        );
    }

    public updateElement(playerLocation: HexId): void {
        if (playerLocation === this.marketLocation) {
            this.background.fill(COLOR.marketOrange);
        } else {
            this.background.fill(COLOR.marketDarkOrange);
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}