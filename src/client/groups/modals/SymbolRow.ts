import Konva from 'konva';
import { ItemToken } from '../player';
import { ItemName, Unique } from '~/shared_types';
import { DynamicGroupInterface, GroupLayoutData } from '~/client_types';
import { FavorToken } from '../popular';

type TokenData = { x: number, token: ItemToken | FavorToken | null }
type Update = {
    items: Array<ItemName | 'favor'>,
    isClickable?: boolean
}

export class SymbolRow implements Unique<DynamicGroupInterface<Update>>{
    private group: Konva.Group;
    private stage: Konva.Stage;
    private drawData: Array<TokenData>;
    private itemCallback: ((name: ItemName) => void);
    private symbolCallback: ((name: ItemName) => void);

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        itemCallback: (name: ItemName) => void,
        symbolCallback: (name: ItemName) => void,
    ) {
        this.itemCallback = itemCallback;
        this.symbolCallback = symbolCallback;
        this.group = new Konva.Group({ ...layout });
        this.stage = stage;
        const segmentWidth = 30;
        this.drawData = [
            { x: segmentWidth * 3, token: null },
            { x: segmentWidth * 2, token: null },
            { x: segmentWidth, token: null },
            { x: 0, token: null },
        ];
    }

    public getElement() {
        return this.group;
    }

    public update(data: Update) {
        const { items, isClickable } = data;
        for (const oldItem of this.drawData) {
            oldItem.token = oldItem.token?.selfDestruct() || null;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item) {
                this.addItem(item, this.drawData[i], isClickable || false);
            }
        }
    }

    private addItem(itemName: ItemName | 'favor', slot: TokenData, isClickable: boolean): void {
        const token = itemName == 'favor'
            ? new FavorToken(
                this.stage,
                { x: slot.x, y: 4 },
                this.symbolCallback,
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