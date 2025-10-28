import Konva from 'konva';
import { DynamicGroupInterface } from '~/client/client_types';
import { NeutralColor, PlayerColor } from '~/shared_types';
import clientConstants from '~/client/client_constants';
const { COLOR } = clientConstants;
type SymbolicInfluenceDialUpdate = {
    color: PlayerColor | NeutralColor,
    symbol: string,
}
export class SymbolicInfluenceDial implements DynamicGroupInterface<SymbolicInfluenceDialUpdate> {
    private group: Konva.Group;
    private dieFace: Konva.Rect;
    private dieSymbol: Konva.Text;
    constructor(data?: SymbolicInfluenceDialUpdate) {

        this.group = new Konva.Group();

        this.dieFace = new Konva.Rect({
            width: 50,
            height: 50,
            cornerRadius: 10,
            fill: data?.color,
        });
        this.dieSymbol = new Konva.Text({
            text: data?.symbol,
            width: this.dieFace.width(),
            height: this.dieFace.height(),
            align: 'center',
            verticalAlign: 'middle',
            y: 5,
            fontSize: 38,
            fontFamily: 'Custom',
            fontStyle: '700',
        });

        this.group.add(this.dieFace, this.dieSymbol);
    }

    update(data: SymbolicInfluenceDialUpdate) {
        this.dieSymbol.text(data.symbol) ;
        this.dieFace.fill(COLOR[data.color]);
    }

    getElement() {
        return this.group;
    }
}