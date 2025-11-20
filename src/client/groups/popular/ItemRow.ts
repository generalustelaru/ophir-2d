import Konva from 'konva';
import { ItemToken } from '../player';
import { ItemName } from '~/shared_types';
import { GroupLayoutData } from '~/client_types';
import { Communicator } from '~/client/services/Communicator';
import { FavorToken } from '.';
type Specificity = {
    alignRight?: boolean,
    spacing?: number,
    itemCallback?: (name: ItemName) => void,
    favorCallback?: Function,
}
type TokenData = { x: number, token: ItemToken | FavorToken | null }
export class ItemRow extends Communicator {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private drawData: Array<TokenData>;
    private itemCallback: ((name: ItemName) => void) | null;
    private favorCallback: Function | null;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        specificity: Specificity = { alignRight: false, spacing: 30 },
    ) {
        super();

        const { alignRight, spacing, itemCallback, favorCallback } = specificity;
        this.itemCallback = itemCallback || null;
        this.favorCallback = favorCallback || null;
        this.group = new Konva.Group({ ...layout });
        this.stage = stage;
        const segmentWidth = spacing || 30;
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

    public update(items: Array<ItemName | 'favor'>, isClickable: boolean = false) {
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

    private addItem(itemName: ItemName | 'favor', slot: TokenData, isClickable: boolean): void {
        const token = itemName == 'favor'
            ? new FavorToken(
                this.stage,
                { x: slot.x, y: 4 },
                this.favorCallback,
            )
            : new ItemToken(
                this.stage,
                { x: slot.x, y: 4 },
                itemName,
                isClickable ? this.itemCallback : null,
            );

        slot.token = token;
        this.group.add(token.getElement());
    }

}