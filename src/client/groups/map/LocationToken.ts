import Konva from 'konva';
import { LocationIconData, DynamicGroupInterface } from '../../client_types';
import { ActionButton } from '../ActionButton';
import { LocationId } from '../../../shared_types';

type LocationTokenUpdate = {
    mayPickup: boolean
    templeIcon: LocationIconData|null
};

export class LocationToken extends ActionButton implements DynamicGroupInterface<LocationTokenUpdate> {
    icon: Konva.Path;
    id: LocationId;

    constructor(
        stage: Konva.Stage,
        locationId: LocationId,
        iconData: LocationIconData
    ) {
        const isPickup = ['mines', 'quary', 'forest', 'farms'].includes(locationId);
        const scale = 3;

        super(
            stage,
            { width: 100, height: 100, x: 0, y: 0 },
            isPickup ? { action: 'pickup_good', details: null } : null
        );

        this.id = locationId;

        const verticalDrift = ((): number => {
            switch (locationId) {
                case 'temple': return -36;
                default: return -18;
            }
        })();

        const horizontalDrift = ((): number => {
            switch (locationId) {
                case 'temple': return -36;
                case 'treasury': return -36;
                default: return -18;
            }
        })();

        this.icon = new Konva.Path({
            x: horizontalDrift,
            y: verticalDrift,
            data: iconData.shape,
            fill: iconData.fill,
            stroke: 'white',
            strokeWidth: .75,
            scale: { x: scale, y: scale },
        });
        this.group.add(this.icon);
    }

    public getElement() {
        return this.group;
    }

    public getId(): LocationId {
        return this.id;
    }

    public updateElement(update: LocationTokenUpdate): void {
        this.setEnabled(update.mayPickup);

        if (update.templeIcon) {
            this.icon.data(update.templeIcon.shape);
            this.icon.fill(update.templeIcon.fill);
        }
    }
}