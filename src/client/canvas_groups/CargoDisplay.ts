import Konva from 'konva';
import clientConstants from '../client_constants';
import { CargoManifest, ManifestItem } from '../../shared_types';
import { DynamicGroupInterface } from '../client_types';

const { COLOR, CARGO_ITEM_DATA } = clientConstants;

type CargoSlot = {
    x: number,
    y: number,
    element: Konva.Path|null,
}
export class CargoDisplay implements DynamicGroupInterface<CargoManifest>{
    private group: Konva.Group;
    private cargoDisplay: Konva.Rect;
    private cargoDrawData: Array<CargoSlot>;

    constructor(isMaxHold: boolean = false) {
        this.group = new Konva.Group({
            width: 80,
            height: 25,
            x: 10,
            y: 10,
        });

        this.cargoDrawData = [
            {x: 0, y: 0, element: null},
            {x: 15, y: 0, element: null},
            {x: 0, y: 15, element: null},
            {x: 15, y: 15, element: null},
        ];
        this.cargoDisplay = new Konva.Rect({
            width: isMaxHold ? 80 : 40,
            height: 25,
            fill: COLOR['wood'],
            cornerRadius: 5,
            strokeWidth: 1,
        });
        this.group.add(this.cargoDisplay);
    }

    public updateElement(cargo: CargoManifest) {

        for (let i = 0; i < this.cargoDrawData.length; i++) {
            const slot = this.cargoDrawData[i];
            if (slot.element) {
                slot.element.destroy();
            }
        }

        for (let i = 0; i < cargo.length; i++) {
            const item = cargo[i];
            const driftData = this.cargoDrawData[i];
            if (item) {
                this.addItem(item, driftData);
            }
        }
    };

    private addItem(itemId: ManifestItem, cargoSlot: CargoSlot) {
        const itemData = CARGO_ITEM_DATA[itemId];
        const itemIcon = new Konva.Path({
            x: cargoSlot.x + this.cargoDisplay.x(),
            y: cargoSlot.y + this.cargoDisplay.y(),
            data: itemData.shape,
            fill: itemData.fill,
            stroke: 'white',
            strokeWidth: 1,
        });
        cargoSlot.element = itemIcon;
        this.group.add(itemIcon);
    }

    public increaseDisplayWidth() {
        const currentWidth = this.cargoDisplay.width();
        this.cargoDisplay.width(currentWidth + 20);
    }

    public getElement() {
        return this.group;
    }
}