import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData } from "../client_types";
import { MarketCard } from "../canvas_groups/CanvasGroups";

export class LocationGroup implements MegaGroupInterface {

    private group: Konva.Group;
    private layout: GroupLayoutData;
    private marketCard: MarketCard|null = null;
    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.layout = layout;

        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
        });

        stage.getLayers()[0].add(this.group);
    }

    drawElements(): void {
        this.marketCard = new MarketCard(this.layout);
        this.group.add(this.marketCard.getElement());
    }

    updateElements(): void {
        console.warn('updateElements: Method not implemented.');
    }
}