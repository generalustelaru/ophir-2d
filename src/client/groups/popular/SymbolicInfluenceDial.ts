import Konva from 'konva';
import { DynamicGroupInterface, Unique } from '~/client/client_types';
import { Coordinates, NeutralColor, PlayerColor } from '~/shared_types';
import clientConstants from '~/client/client_constants';
const { COLOR } = clientConstants;
type SymbolicInfluenceDialUpdate = {
    color?: PlayerColor | NeutralColor,
    symbol?: string,
    position?: Coordinates,
}
export class SymbolicInfluenceDial implements Unique<DynamicGroupInterface<SymbolicInfluenceDialUpdate>> {
    private group: Konva.Group;
    private dieFace: Konva.Rect;
    private dieSymbol: Konva.Text;
    constructor(data?: SymbolicInfluenceDialUpdate) {

        this.group = new Konva.Group({
            x: data?.position?.x || 0,
            y: data?.position?.y || 0,
        });

        this.dieFace = new Konva.Rect({
            width: 50,
            height: 50,
            cornerRadius: 10,
            fill: data?.color ? COLOR[data.color] : undefined,
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
        if (data.symbol)
            this.dieSymbol.text(data.symbol) ;

        if (data.color)
            this.dieFace.fill(COLOR[data.color]);

        if (data.position) {
            this.group.x(data.position.x);
            this.group.y(data.position.y);
        }
    }

    getElement() {
        return this.group;
    }
}