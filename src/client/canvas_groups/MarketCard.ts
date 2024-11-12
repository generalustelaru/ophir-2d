import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import clientConstants from "../client_constants";

const { COLOR } = clientConstants;
type Market = any;
export class MarketCard implements DynamicGroupInterface<any> {

    private group: Konva.Group;
    private background: Konva.Rect;

    constructor(
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: 10,
            y: 10,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height()/2,
            fill: COLOR.marketOrange,
            stroke: 'white',
            cornerRadius: 15,
            strokeWidth: 3,
        });

        this.group.add(
            this.background,
        );
    }

    public updateElement(market: Market): void {
        console.log('MarketCard.updateElement', market);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}