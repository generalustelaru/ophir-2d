
import Konva from 'konva';
import { HexaColor } from '../client_types';
import { GoodId, CargoManifest, MetalId } from '../../shared_types';
import clientConstants from '../client_constants';

const { CARGO_HOLD_DATA } = clientConstants;

export class CargoHold {

    group: Konva.Group;
    hold: Konva.Rect;
    manifest: CargoManifest;

    constructor(
        color: HexaColor,
        isLargeHold: boolean = false,
        manifest: CargoManifest = [],
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

        this.manifest = manifest;

        // this.addItem('gem');
        // this.addGood('stone');
    }

    public addItem(itemId: GoodId|MetalId) {
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