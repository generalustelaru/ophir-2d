
import Konva from 'konva';
import { HexaColor } from '../client_types';
import { ItemId, CargoManifest } from '../../shared_types';
import clientConstants from '../client_constants';

const { CARGO_HOLD_DATA } = clientConstants;

export class CargoHold {

    group: Konva.Group;
    hold: Konva.Rect;
    manifest: CargoManifest = [null, null, null, null];

    constructor(
        color: HexaColor,
        isLargeHold: boolean = true,
    ) {
        this.group = new Konva.Group({
            width: 200,
            height: 200,
            x: 525,
            y: 25,
        });

        this.hold = new Konva.Rect({
            width: 200,
            height: isLargeHold ? 200 : 100,
            fill: color,
            cornerRadius: 15,
            strokeWidth: 1,
        });

        this.group.add(this.hold);

        this.manifest = {
            row_a: { item_a: null, item_b: null },
            row_b: isLargeHold ? { item_a: null, item_b: null } : null,
        };

        this.addItem('gem');
        this.addItem('stone');
    }

    public addItem(itemId: ItemId) {
        this.manifest.push(itemId);
        const itemData = CARGO_HOLD_DATA[itemId];
        const itemIcon = new Konva.Path({
            x: 0,
            y: 0,
            data: itemData.shape,
            fill: itemData.fill,
            stroke: 'white',
            strokeWidth: 1,
            scale: {x: 5, y: 5},
        });
        this.group.add(itemIcon);
    }

    public getElement() {
        return this.group;
    }

    public upgradeHold() {
        this.hold.height(200);
    }
}