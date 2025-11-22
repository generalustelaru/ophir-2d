import Konva from 'konva';
import { ItemToken } from '../player';
import { ItemName, Unique } from '~/shared_types';
import { DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { FavorToken } from '.';

type Specificity = {
    alignRight?: boolean,
    spacing?: number,
    itemCallback?: (name: ItemName) => void,
}
type TokenData = { x: number, token: ItemToken | FavorToken | null }
type Update = { items: Array<ItemName>, isClickable?: boolean }

export class ItemRow implements Unique<DynamicGroupInterface<Update>>{
    private group: Konva.Group;
    private stage: Konva.Stage;
    private drawData: Array<TokenData>;
    private itemCallback: ((name: ItemName) => void) | null;
    private isRightAligned: boolean = false;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        specificity: Specificity = { alignRight: false, spacing: 30 },
    ) {
        const { alignRight, spacing, itemCallback } = specificity;
        const segmentWidth = spacing || 30;

        this.stage = stage;
        this.itemCallback = itemCallback || null;
        this.group = new Konva.Group({ ...layout });
        this.drawData = [
            { x: 0, token: null },
            { x: segmentWidth, token: null },
            { x: segmentWidth * 2, token: null },
            { x: segmentWidth * 3, token: null },
        ];

        if (alignRight) {
            this.drawData = this.drawData.reverse();
            this.isRightAligned = true;
        }
    }

    public getElement() {
        return this.group;
    }

    public update(data: Update) {

        for (const oldItem of this.drawData) {
            oldItem.token = oldItem.token?.selfDestruct() || null;
        }

        const { items, isClickable } = data;
        const displayItems = [...items];
        this.isRightAligned && displayItems.reverse();

        displayItems.forEach((newItem, index) => {
            this.addItem(newItem, this.drawData[index], isClickable || false);
        });
    }

    private addItem(itemName: ItemName, slot: TokenData, isClickable: boolean): void {
        const token = new ItemToken(
            this.stage,
            { x: slot.x, y: 4 },
            itemName,
            isClickable ? this.itemCallback : null,
        );

        slot.token = token;
        this.group.add(token.getElement());
    }

}