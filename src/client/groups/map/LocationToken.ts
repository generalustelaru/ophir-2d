import Konva from 'konva';
import { LocationIconData, DynamicGroupInterface } from '../../client_types';
import { ActionButton } from '../ActionButton';
import { LocationName } from '../../../shared_types';

type LocationTokenUpdate = {
    mayPickup: boolean
    templeIcon: LocationIconData|null
};

export class LocationToken extends ActionButton implements DynamicGroupInterface<LocationTokenUpdate> {
    icon: Konva.Path;
    id: LocationName;

    constructor(
        stage: Konva.Stage,
        locationId: LocationName,
        iconData: LocationIconData
    ) {
        const isGoodsLocation = ['mines', 'quary', 'forest', 'farms'].includes(locationId);
        const scale = 3;

        super(
            stage,
            { width: 100, height: 100, x: 0, y: 0 },
            isGoodsLocation ? { action: 'load_good', payload: null } : null
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

    public getId(): LocationName {
        return this.id;
    }

    public update(update: LocationTokenUpdate): void {
        this.setEnabled(update.mayPickup);

        if (update.templeIcon) {
            this.icon.data(update.templeIcon.shape);
            this.icon.fill(update.templeIcon.fill);
        }
    }
}