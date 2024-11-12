import Konva from 'konva';
import { CanvasStaticGroupInterface, SettlementData } from '../client_types';

export class LocationToken implements CanvasStaticGroupInterface{

    group: Konva.Group;
    icon: Konva.Path;

    constructor(settlement: SettlementData) {
        this.group = new Konva.Group({});

        this.icon = new Konva.Path({
            x: -26,
            y: -26,
            data: settlement.shape,
            fill: settlement.fill,
            stroke: 'white',
            strokeWidth: 1,
            scale: {x: 2, y: 2},
        });
        this.group.add(this.icon);
    }

    public getElement() {
        return this.group;
    }
}