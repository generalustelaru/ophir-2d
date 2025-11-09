import Konva from 'konva';
import { CargoToken } from '../player';
import { ItemName } from '~/shared_types';
import { GroupLayoutData } from '~/client/client_types';

type TokenData = { x: number, token: CargoToken | null }
export class ItemRow {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private drawData: Array<TokenData>;
    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        segmentWidth: number,
        alignRight: boolean = false,
    ) {
        this.group = new Konva.Group({ ...layout });
        this.stage = stage;
        this.drawData = [
            { x: 0, token: null },
            { x: segmentWidth, token: null },
            { x: segmentWidth * 2, token: null },
            { x: segmentWidth * 3, token: null },
        ];

        if (alignRight)
            this.drawData = this.drawData.reverse();
    }

    public getElement() {
        return this.group;
    }

    public update(items: Array<ItemName>, isClickable: boolean = false) {
        for (const oldItem of this.drawData) {
            oldItem.token = oldItem.token?.selfDestruct() || null;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item) {
                this.addItem(item, this.drawData[i], isClickable);
            }
        }
    }

    private addItem(itemId: ItemName, slot: TokenData, isClickable: boolean): void {
        const token = new CargoToken(
            this.stage,
            { x: slot.x, y: 4 }, //TODO: remove fixed y value
            itemId,
            isClickable,
        );

        slot.token = token;
        this.group.add(token.getElement());
    }
}