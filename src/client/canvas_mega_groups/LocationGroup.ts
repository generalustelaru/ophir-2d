import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData } from "../client_types";
import { MarketCard, ExchangeCard } from "../canvas_groups/CanvasGroups";

// type CardLayoutData = {width: number, height: number, x: number, y: number};
export class LocationGroup implements MegaGroupInterface {

    private group: Konva.Group;
    private layout: GroupLayoutData;
    private marketCard: MarketCard | null = null;
    private exchangeCard: ExchangeCard | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.layout = layout;

        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        stage.getLayers()[0].add(this.group);
    }

    drawElements(): void {
        const heightSegment = this.layout.height / 5;

        this.marketCard = new MarketCard({
            width: this.layout.width,
            height: heightSegment * 2,
            x: 0,
            y: 0
        });

        this.exchangeCard = new ExchangeCard({
            width: this.layout.width,
            height: heightSegment,
            x: 0,
            y: heightSegment * 2
        });

        this.group.add(
            this.marketCard.getElement(),
            this.exchangeCard.getElement(),
        );
    }

    updateElements(): void {
        console.warn('updateElements: Method not implemented.');
    }
}