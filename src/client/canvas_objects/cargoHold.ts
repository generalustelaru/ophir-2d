
import Konva from 'konva';
import { CargoHoldInterface, HexaColor } from '../client_types';
import { CargoManifest, ManifestItem } from '../../shared_types';
import clientConstants from '../client_constants';

const { CARGO_ITEM_DATA: CARGO_HOLD_DATA } = clientConstants;

export class CargoHold implements CargoHoldInterface {

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
    }

    public updateHold(cargo: CargoManifest) {
        const driftTable = [
            {x: 0, y: 0},
            {x: 50, y: 0},
            {x: 0, y: 50},
            {x: 50, y: 50},
        ]

        for (let i = 0; i < cargo.length; i++) {
            const item = cargo[i];
            const driftData = driftTable[i];
            if (item) {
                this.addItem(item, driftData);
            }
        }
    };

    private addItem(itemId: ManifestItem, driftData: { x: number, y: number }) {
        this.manifest.push(itemId);
        const itemData = CARGO_HOLD_DATA[itemId];
        const itemIcon = new Konva.Path({
            id: itemId,
            x: driftData.x,
            y: driftData.y,
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