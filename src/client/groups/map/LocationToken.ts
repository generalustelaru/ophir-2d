import Konva from 'konva';
import { IconLayer, DynamicGroupInterface } from "~/client_types";
import { ActionButton } from '../ActionButton';
import { Action, LocationName, TradeGood } from "~/shared_types";
import { EmptyLocationToken } from './EmptyLocationToken';

type LocationTokenUpdate = {
    tradeGoodSupplies: Record<TradeGood, number>
    mayPickup: boolean
    templeIcon: IconLayer|null
};

export class LocationToken extends ActionButton implements DynamicGroupInterface<LocationTokenUpdate> {
    private icon: Konva.Path;
    private id: LocationName;
    private emptyLocation: EmptyLocationToken;
    private tradeGood: TradeGood | null;

    constructor(
        stage: Konva.Stage,
        locationId: LocationName,
        iconData: IconLayer
    ) {
        const goodToPickup = ((): TradeGood | null => {
            switch (locationId) {
                case 'mines': return 'gems';
                case 'quarry': return 'marble';
                case 'forest': return 'ebony';
                case 'farms': return 'linen';
                default: return null;
            }
        })();

        const scale = 3;

        super(
            stage,
            { width: 100, height: 100, x: 0, y: 0 },
            goodToPickup
                ? { action: Action.load_good, payload: { tradeGood: goodToPickup } }
                : null,
        );

        this.id = locationId;
        this.tradeGood = goodToPickup;

        const verticalDrift = ((): number => {
            switch (locationId) {
                // case 'temple': return -36;
                default: return -18;
            }
        })();

        const horizontalDrift = ((): number => {
            switch (locationId) {
                // case 'temple':
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

        this.emptyLocation = new EmptyLocationToken();

        if (this.tradeGood) {
            this.group.add(this.emptyLocation.getElement());
        }
    }

    public getElement() {
        return this.group;
    }

    public getId(): LocationName {
        return this.id;
    }

    public update(update: LocationTokenUpdate): void {
        if (this.tradeGood) {
            const supply = update.tradeGoodSupplies[this.tradeGood]

            this.setEnabled(supply > 0 && update.mayPickup);
            this.emptyLocation.update(supply > 0);
        }

        if (update.templeIcon && this.id === "temple") {
            this.icon.data(update.templeIcon.shape);
            this.icon.fill(update.templeIcon.fill);
            this.icon.x(-36);
            this.icon.y(-36);
        }
    }
}