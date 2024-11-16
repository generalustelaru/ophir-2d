import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData, LocationCardUpdate } from "../client_types";
import clientConstants from "../client_constants";
import { HexId, MarketFluctuations, MarketKey, MarketOffer } from "../../shared_types";
import { FutureContractDisplay, OpenContractDisplay } from "./CanvasGroups";

const { COLOR } = clientConstants;

export class MarketCard implements DynamicGroupInterface<LocationCardUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private marketLocation: HexId;
    private futureDisplay: FutureContractDisplay;
    private slot_1: OpenContractDisplay;
    private slot_2: OpenContractDisplay;
    private slot_3: OpenContractDisplay;

    constructor(
        location: HexId,
        marketFluctuations: MarketFluctuations,
        market: MarketOffer,
        layout: GroupLayoutData,
    ) {
        this.marketLocation = location;

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
        const contractCardWidth = this.group.width() / 4;

        this.futureDisplay = new FutureContractDisplay({
                width: contractCardWidth,
                height: totalHeight,
                x: 0,
                y: 0,
            },
            market.future,
        );

        this.slot_1 = new OpenContractDisplay(
            {
                width: contractCardWidth,
                height: totalHeight,
                x: contractCardWidth,
                y: 0,
            },
            market.slot_1,
            marketFluctuations.slot_1,
        );

        this.slot_2 = new OpenContractDisplay(
            {
                width: contractCardWidth,
                height: totalHeight,
                x: contractCardWidth * 2,
                y: 0,
            },
            market.slot_2,
            marketFluctuations.slot_2,
        );

        this.slot_3 = new OpenContractDisplay(
            {
                width: contractCardWidth,
                height: totalHeight,
                x: contractCardWidth * 3,
                y: 0,
            },
            market.slot_3,
            marketFluctuations.slot_3,
        );

        this.group.add(
            this.background,
            this.futureDisplay.getElement(),
            this.slot_1.getElement(),
            this.slot_2.getElement(),
            this.slot_3.getElement(),
        );
    }

    public updateElement(data: LocationCardUpdate): void {
        this.futureDisplay.updateElement(data.contracts.future);
        const activePlayerIsHere = data.playerLocation === this.marketLocation;
        const cardSlots: Array<MarketKey> = ['slot_1', 'slot_2', 'slot_3'];

        cardSlots.forEach(slot => {
            this[slot].updateElement({
                contract: data.contracts.slot_1,
                isFeasible: activePlayerIsHere && data.feasibleContracts.includes(slot),
            });
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}
