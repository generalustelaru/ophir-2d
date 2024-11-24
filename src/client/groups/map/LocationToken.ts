import Konva from 'konva';
import { LocationIconData, DynamicGroupInterface } from '../../client_types';
import { ActionButton } from '../ActionButton';

export class LocationToken extends ActionButton implements DynamicGroupInterface<boolean> {
    icon: Konva.Path;

    constructor(
        stage: Konva.Stage,
        iconData: LocationIconData
    ) {
        const isPickup = ['mines', 'quary', 'forest', 'farms'].includes(iconData.id);
        const scale = 3;
        const drift = -20;

        super(
            stage,
            {width: 100, height: 100, x: 0, y: 0},
            isPickup ? { action: 'pickup_good', details: null } : null
        );

        this.icon = new Konva.Path({
            x: drift - (iconData.id === 'exchange' ? 20 : 0),
            y: drift,
            data: iconData.shape,
            fill: iconData.fill,
            stroke: 'white',
            strokeWidth: .75,
            scale: {x: scale, y: scale},
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