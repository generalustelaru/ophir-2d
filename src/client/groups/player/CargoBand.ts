import Konva from 'konva';
import clientConstants from '../../client_constants';
import { CargoManifest, ManifestItem, PlayerId } from '../../../shared_types';
import { Color, DynamicGroupInterface } from '../../client_types';

const { COLOR, CARGO_ITEM_DATA } = clientConstants;
const SLOT_WIDTH = 25;

type CargoSlot = {
    x: number,
    element: Konva.Path | null,
}
export class CargoBand implements DynamicGroupInterface<CargoManifest> {
    private group: Konva.Group;
    private cargoDisplay: Konva.Rect;
    private cargoDrawData: Array<CargoSlot>;

    constructor(playerId: PlayerId, cargo: CargoManifest) {
        this.group = new Konva.Group({
            width: SLOT_WIDTH * 4,
            height: 30,
            x: 10,
            y: 5,
        });
        this.cargoDrawData = [
            { x: 0, element: null },
            { x: SLOT_WIDTH, element: null },
            { x: SLOT_WIDTH * 2, element: null },
            { x: SLOT_WIDTH * 3, element: null },
        ];
        const backgroundMapping: Record<PlayerId, Color> = {
            playerRed: COLOR.holdDarkRed,
            playerPurple: COLOR.holdDarkPurple,
            playerGreen: COLOR.holdDarkGreen,
            playerYellow: COLOR.holdDarkYellow,
        }
        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: backgroundMapping[playerId],
            stroke: COLOR.stampEdge,
            cornerRadius: 5,
            strokeWidth: 1,
        });
        this.cargoDisplay = new Konva.Rect({
            width: cargo.length * SLOT_WIDTH,
            height: this.group.height(),
            fill: 'black',
            cornerRadius: 5,
        });
        this.group.add(...[
            background,
            this.cargoDisplay
        ]);
        this.updateElement(cargo);
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
            y: 4,
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