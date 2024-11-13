import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData } from "../client_types";
import { MarketCard, ExchangeCard, TempleCard } from "../canvas_groups/CanvasGroups";

export class LocationGroup implements MegaGroupInterface {

    private group: Konva.Group;
    private marketCard: MarketCard | null = null;
    private exchangeCard: ExchangeCard | null = null;
    private templeCard: TempleCard | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height - 20,
            x: layout.x + 10,
            y: layout.y + 10,
        });
        stage.getLayers()[0].add(this.group);
    }

    drawElements(): void {
        const heightSegment = this.group.height() / 5;

        this.marketCard = new MarketCard({
            width: this.group.width(),
            height: heightSegment * 2,
            x: 0,
            y: 0,
        });

        this.exchangeCard = new ExchangeCard({
            width: this.group.width(),
            height: heightSegment,
            x: 0,
            y: heightSegment * 2,
        });

        this.templeCard = new TempleCard({
            width: this.group.width(),
            height: heightSegment * 2,
            x: 0,
            y: heightSegment * 3,
        });

        this.group.add(
            this.marketCard.getElement(),
            this.exchangeCard.getElement(),
            this.templeCard.getElement(),
        );
    }

    updateElements(): void {
        console.warn('updateElements: Method not implemented.');
    }
}