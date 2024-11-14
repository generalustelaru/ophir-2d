import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import clientConstants from "../client_constants";
import { HexId } from "../../shared_types";

const { COLOR } = clientConstants;

export class MarketCard implements DynamicGroupInterface<HexId> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private marketLocation: HexId;

    constructor(
        location: HexId,
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
            cornerRadius: 15,
        });

        this.group.add(
            this.background,
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