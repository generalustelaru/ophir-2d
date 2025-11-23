import Konva from 'konva';
import { ItemToken } from '../player';
import { SpecialistName, Unique } from '~/shared_types';
import { DynamicGroupInterface, Specification, GroupLayoutData } from '~/client_types';
import { TradeGoodToken, FavorToken, RetainedToken } from './';

type TokenData = { x: number, token: ItemToken | FavorToken | null }
type Update = {
    specifications: Array<Specification>,
    specialist: SpecialistName.peddler | SpecialistName.chancellor,
}

export class SymbolRow implements Unique<DynamicGroupInterface<Update>> {

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

        const { specifications: items, specialist } = data;
        const omitSymbol = specialist == SpecialistName.chancellor ? 'favor' : 'retained';

        let layoutIndex = 3 - items.length;
        items.forEach((item, index) => {
            this.addItem(layoutIndex++, index, item, omitSymbol);
        });
    }

    private addItem(layoutIndex: number, itemIndex: number, item: Specification, omitSymbol: 'favor' | 'retained'): void {
        const data = this.drawData[layoutIndex];
        const callback = () => this.switchCallback(itemIndex);
        const token = (() => {
            if (item.isOmited) {
                return omitSymbol == 'favor'
                    ? new FavorToken(
                        this.stage,
                        { x: data.x, y: 4 },
                        item.isLocked ? null : callback,
                    )
                    : new RetainedToken(
                        this.stage,
                        { x: data.x, y: 4 },
                        item.isLocked ? null : callback,
                    );
            }

            return new TradeGoodToken(
                this.stage,
                { x: data.x, y: 4 },
                item.name,
                item.isLocked ? null : callback,
            );
        })();

        data.token = token;
        this.group.add(token.getElement());
    }

}