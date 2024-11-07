
import Konva from 'konva';
import { PlayMatInterface, Color } from '../client_types';
import { CargoManifest, ManifestItem } from '../../shared_types';
import clientConstants from '../client_constants';

const { CARGO_ITEM_DATA: CARGO_HOLD_DATA } = clientConstants;

type CargoSlot = {
    x: number,
    y: number,
    element: Konva.Path|null,
}
export class PlayMat implements PlayMatInterface {

    playMat: Konva.Group;
    hold: Konva.Rect;
    cargoData: Array<CargoSlot>;

    constructor(
        color: Color,
        isLargeHold: boolean = false,
    ) {
        this.playMat = new Konva.Group({
            width: 40,
            height: 40,
            x: 525,
            y: 25,
        });

        this.hold = new Konva.Rect({
            width: 40,
            height: isLargeHold ? 40 : 25,
            fill: color,
            // cornerRadius: 15,
            strokeWidth: 1,
        });

        this.playMat.add(this.hold);

        this.cargoData = [
            {x: 0, y: 0, element: null},
            {x: 15, y: 0, element: null},
            {x: 0, y: 15, element: null},
            {x: 15, y: 15, element: null},
        ];
    }

    public updateHold(cargo: CargoManifest) {

        for (let i = 0; i < this.cargoData.length; i++) {
            const slot = this.cargoData[i];
            if (slot.element) {
                slot.element.destroy();
            }
        }

        for (let i = 0; i < cargo.length; i++) {
            const item = cargo[i];
            const driftData = this.cargoData[i];
            if (item) {
                this.addItem(item, driftData);
            }
        }
    };

    private addItem(itemId: ManifestItem, cargoSlot: CargoSlot) {
        const itemData = CARGO_HOLD_DATA[itemId];
        const itemIcon = new Konva.Path({
            x: cargoSlot.x,
            y: cargoSlot.y,
            data: itemData.shape,
            fill: itemData.fill,
            stroke: 'white',
            strokeWidth: 1,
            // scale: {x: 5, y: 5},
        });
        cargoSlot.element = itemIcon;
        this.playMat.add(itemIcon);
    }

    public getElement() {
        return this.playMat;
    }

    public upgradeHold() {
        this.hold.height(40);
    }
}