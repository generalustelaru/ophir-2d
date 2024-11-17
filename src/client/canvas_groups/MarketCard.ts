import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData, MarketUpdate } from "../client_types";
import clientConstants from "../client_constants";
import { MarketFluctuations, MarketKey, MarketOffer } from "../../shared_types";
import { FutureContractDisplay, OpenContractDisplay } from "./CanvasGroups";

const { COLOR } = clientConstants;

export class MarketCard implements DynamicGroupInterface<MarketUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private futureDisplay: FutureContractDisplay;
    private slot_1: OpenContractDisplay;
    private slot_2: OpenContractDisplay;
    private slot_3: OpenContractDisplay;

    constructor(
        stage: Konva.Stage,
        marketFluctuations: MarketFluctuations,
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
        const contractCardWidth = this.group.width() / 4;

        this.futureDisplay = new FutureContractDisplay(
            stage,
            {
                width: contractCardWidth,
                height: totalHeight,
                x: 0,
                y: 0,
            },
            market.future,
        );

        this.slot_1 = new OpenContractDisplay(
            stage,
            {
                width: contractCardWidth,
                height: totalHeight,
                x: contractCardWidth,
                y: 0,
            },
            'slot_1',
            market.slot_1,
            marketFluctuations.slot_1,
        );

        this.slot_2 = new OpenContractDisplay(
            stage,
            {
                width: contractCardWidth,
                height: totalHeight,
                x: contractCardWidth * 2,
                y: 0,
            },
            'slot_2',
            market.slot_2,
            marketFluctuations.slot_2,
        );

        this.slot_3 = new OpenContractDisplay(
            stage,
            {
                width: contractCardWidth,
                height: totalHeight,
                x: contractCardWidth * 3,
                y: 0,
            },
            'slot_3',
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

    public updateElement(data: MarketUpdate): void {
        this.futureDisplay.updateElement(data.contracts.future);

        const localPlayer = data.localPlayer;

        const localPLayerMaySell = !!(
            localPlayer?.isActive
            && localPlayer?.allowedSettlementAction === 'sell_goods'
        )

        const cardSlots: Array<MarketKey> = ['slot_1', 'slot_2', 'slot_3'];

        cardSlots.forEach(slot => {
            const isFeasible = localPLayerMaySell && localPlayer.feasibleContracts.includes(slot)
            this[slot].updateElement({
                contract: data.contracts[slot],
                isFeasible,
            });
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}
