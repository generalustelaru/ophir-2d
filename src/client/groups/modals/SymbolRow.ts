import Konva from 'konva';
import { ItemToken } from '../player';
import { Unique } from '~/shared_types';
import { DynamicGroupInterface, Specification, GroupLayoutData } from '~/client_types';
import { TradeGoodToken, FavorToken } from './';

type TokenData = { x: number, token: ItemToken | FavorToken | null }
type Update = {
    goods: Array<Specification>,
    isClickable?: boolean
}

export class SymbolRow implements Unique<DynamicGroupInterface<Update>>{
    private group: Konva.Group;
    private stage: Konva.Stage;
    private drawData: Array<TokenData>;
    private switchCallback: ((index: number) => void);

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        switchCallback: (index: number) => void,
    ) {
        this.switchCallback = switchCallback;
        this.group = new Konva.Group({ ...layout });
        this.stage = stage;
        const segmentWidth = 30;
        this.drawData = [
            { x: segmentWidth, token: null },
            { x: segmentWidth * 2, token: null },
            { x: segmentWidth * 3, token: null },
        ];
    }

    public getElement() {
        return this.group;
    }

    public update(data: Update) {

        for (const oldItem of this.drawData) {
            oldItem.token = oldItem.token?.selfDestruct() || null;
        }

        const { goods: items } = data;

        let layoutIndex = 3 - items.length;
        items.forEach((item, index) => {
            this.addItem(layoutIndex++, index, item);
        });
    }

    private addItem(
        layoutIndex: number,
        itemIndex: number,
        item: Specification,
    ): void {
        const data = this.drawData[layoutIndex];
        const callback = () => this.switchCallback(itemIndex);
        const token = item.isOmited
            ? new FavorToken(
                this.stage,
                { x: data.x, y: 4 },
                item.isLocked ? null : callback,
            )
            : new TradeGoodToken(
                this.stage,
                { x: data.x, y: 4 },
                item.name,
                item.isLocked ? null : callback,
            );

        data.token = token;
        this.group.add(token.getElement());
    }

}