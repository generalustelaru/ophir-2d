import Konva from 'konva';
import clientConstants from '../client_constants';
import { CargoManifest, ManifestItem } from '../../shared_types';
import { DynamicGroupInterface } from '../client_types';

const { COLOR, CARGO_ITEM_DATA } = clientConstants;
const SLOT_WIDTH = 25;

type CargoSlot = {
    x: number,
    element: Konva.Path | null,
}
export class CargoDisplay implements DynamicGroupInterface<CargoManifest> {
    private group: Konva.Group;
    private cargoDisplay: Konva.Rect;
    private cargoDrawData: Array<CargoSlot>;

    constructor(cargo: CargoManifest) {
        this.group = new Konva.Group({
            width: cargo.length * SLOT_WIDTH,
            height: 30,
            x: 10,
            y: 5,
        });
        const pathBackDrift = -14;
        this.cargoDrawData = [
            { x: pathBackDrift, element: null },
            { x: pathBackDrift + SLOT_WIDTH, element: null },
            { x: pathBackDrift + SLOT_WIDTH * 2, element: null },
            { x: pathBackDrift + SLOT_WIDTH * 3, element: null },
        ];
        this.cargoDisplay = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.holdDarkRed,
            stroke: COLOR.stampEdge,
            hitStrokeWidth: 2,
            cornerRadius: 5,
            strokeWidth: 1,
        });
        this.group.add(this.cargoDisplay);
    }

    public updateElement(cargo: CargoManifest): void {
        this.cargoDisplay.width(cargo.length * SLOT_WIDTH);

        for (const slot of this.cargoDrawData) {
            slot.element?.destroy();
        }

        for (let i = 0; i < cargo.length; i++) {
            const item = cargo[i];
            if (item) {
                const slot = this.cargoDrawData[i];
                this.addItem(item, slot);
            }
        }
    };

    private addItem(itemId: ManifestItem, cargoSlot: CargoSlot): void {
        const itemData = CARGO_ITEM_DATA[itemId];
        const itemIcon = new Konva.Path({
            x: cargoSlot.x,
            y: - 12,
            data: itemData.shape,
            fill: itemData.fill,
            stroke: 'white',
            strokeWidth: 1,
            scale: { x: 2, y: 2 },
        });
        cargoSlot.element = itemIcon;
        this.group.add(itemIcon);
    }

    public getElement() {
        return this.group;
    }
}