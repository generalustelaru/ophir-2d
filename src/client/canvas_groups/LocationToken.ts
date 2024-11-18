import Konva from 'konva';
import { SettlementData, DynamicGroupInterface } from '../client_types';
import { ResponsiveGroup } from './ResponsiveGroup';

export class LocationToken extends ResponsiveGroup implements DynamicGroupInterface<boolean> {
    icon: Konva.Path;

    constructor(
        stage: Konva.Stage,
        settlement: SettlementData
    ) {
        super(stage, {width: 100, height: 100, x: 0, y: 0}, { action: 'pickup_good', details: null });

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

    public updateElement(mayPickup: boolean): void {
        this.setEnabled(mayPickup);
    }
}