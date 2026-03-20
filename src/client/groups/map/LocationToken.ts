import Konva from 'konva';
import { IconLayer, DynamicGroupInterface, ElementList } from '~/client_types';
import { LocationName, Commodity, Unique } from '~/shared_types';
import { EmptyLocationToken } from '.';

type LocationTokenUpdate = {
    supplies: Record<Commodity, number>
    templeIcon: IconLayer
};

export class LocationToken implements Unique<DynamicGroupInterface<LocationTokenUpdate>> {
    private group: Konva.Group;
    private icon: Konva.Path;
    private id: LocationName;
    private emptyLocation: EmptyLocationToken;
    private commodity: Commodity | null;

    constructor(
        locationId: LocationName,
        iconData: IconLayer,
        isPlay: boolean,
        commodity: Commodity | null,
    ) {
        this.group = new Konva.Group({ width: 100, height: 100, x: 0, y: 0 });
        const elements: ElementList = [];

        const scale = 3;

        this.id = locationId;
        this.commodity = commodity;

        const verticalDrift = ((): number => {
            switch (locationId) {
                case 'temple': return isPlay ? -36 : -18;
                default: return -18;
            }
        })();

        const horizontalDrift = ((): number => {
            switch (locationId) {
                case 'temple': return isPlay ? -36 : -18;
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
        elements.push(this.icon);

        this.emptyLocation = new EmptyLocationToken();

        if (this.commodity)
            elements.push(this.emptyLocation.getElement());

        this.group.add(...elements);
    }

    public getElement() {
        return this.group;
    }

    public getId(): LocationName {
        return this.id;
    }

    public update(update: LocationTokenUpdate): void {
        if (this.commodity) {
            const supply = update.supplies[this.commodity];
            this.emptyLocation.update(supply > 0);
        }

        if (this.id === 'temple') {
            this.icon.data(update.templeIcon.shape);
            this.icon.fill(update.templeIcon.fill);
            this.icon.x(-36);
            this.icon.y(-36);
        }
    }
}
