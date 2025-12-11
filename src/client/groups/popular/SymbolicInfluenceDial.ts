import Konva from 'konva';
import { DynamicGroupInterface, Hue } from '~/client/client_types';
import { Coordinates, Unique } from '~/shared_types';

type SymbolicInfluenceDialUpdate = {
    hue?: Hue,
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
            fill: data?.hue,
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

    public update(data: SymbolicInfluenceDialUpdate) {
        if (data.symbol)
            this.dieSymbol.text(data.symbol) ;

        if (data.hue)
            this.dieFace.fill(data.hue);

        if (data.position) {
            this.group.x(data.position.x);
            this.group.y(data.position.y);
        }
    }

    public getElement() {
        return this.group;
    }
}