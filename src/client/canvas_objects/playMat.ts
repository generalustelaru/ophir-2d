
import Konva from 'konva';
import { PlayMatInterface, HexaColor } from '../client_types';
import { CargoManifest, ManifestItem } from '../../shared_types';
import clientConstants from '../client_constants';

const { CARGO_ITEM_DATA: CARGO_HOLD_DATA } = clientConstants;

export class PlayMat implements PlayMatInterface {

    playMat: Konva.Group;
    hold: Konva.Rect;
    manifest: CargoManifest;

    constructor(
        color: HexaColor,
        isLargeHold: boolean = false,
        manifest: CargoManifest = [],
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

        this.manifest = manifest;
    }

    public updateHold(cargo: CargoManifest) {
        const driftTable = [
            {x: 0, y: 0},
            {x: 15, y: 0},
            {x: 0, y: 15},
            {x: 15, y: 15},
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
            // scale: {x: 5, y: 5},
        });
        this.playMat.add(itemIcon);
    }

    public getElement() {
        return this.playMat;
    }

    public upgradeHold() {
        this.hold.height(40);
    }
}