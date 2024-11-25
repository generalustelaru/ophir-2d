import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '../../client_types';
import clientConstants from '../../client_constants';
import { HexId } from '../../../shared_types';

const { COLOR, CARGO_ITEM_DATA } = clientConstants;
const SCALE = 2.75;
export class ExchangePlacard implements DynamicGroupInterface<HexId> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private exchangeLocation: HexId

    constructor(
        location: HexId,
        layout: GroupLayoutData,
    ) {
        this.exchangeLocation = location;

        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.exchangeDarkGold,
            cornerRadius: 15,
        });

        const goldIcon1 = new Konva.Path({
            data: CARGO_ITEM_DATA.gold.shape,
            fill: CARGO_ITEM_DATA.gold.fill,
            x: 10,
            y: 10,
            scaleX: SCALE,
            scaleY: SCALE,
        });
        const width = goldIcon1.getClientRect().width;
        console.log('metalWidth',width);
        const goldIcon2 = new Konva.Path({
            data: CARGO_ITEM_DATA.gold.shape,
            fill: CARGO_ITEM_DATA.gold.fill,
            x: 10 + width,
            y: 10,
            scaleX: SCALE,
            scaleY: SCALE,
        });

        const silverIcon1 = new Konva.Path({
            data: CARGO_ITEM_DATA.silver.shape,
            fill: CARGO_ITEM_DATA.silver.fill,
            x: 10 + width * 2,
            y: 10,
            scaleX: SCALE,
            scaleY: SCALE,
        });
        const silverIcon2 = new Konva.Path({
            data: CARGO_ITEM_DATA.silver.shape,
            fill: CARGO_ITEM_DATA.silver.fill,
            x: 10 + width * 3,
            y: 10,
            scaleX: SCALE,
            scaleY: SCALE,
        });

        this.group.add(...[
            this.background,
            goldIcon1,
            goldIcon2,
            silverIcon1,
            silverIcon2,
        ]);
    }

    public updateElement(playerLocation: HexId): void {
        if (playerLocation === this.exchangeLocation) {
            this.background.fill(COLOR.exchangeGold);
        } else {
            this.background.fill(COLOR.exchangeDarkGold);
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}