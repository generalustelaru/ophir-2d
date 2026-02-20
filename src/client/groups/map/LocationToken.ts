import Konva from 'konva';
import { IconLayer, DynamicGroupInterface, ElementList } from '~/client_types';
import { LocationName, TradeGood, Unique } from '~/shared_types';
import { Button } from '../popular';
import { EmptyLocationToken } from '.';

type LocationTokenUpdate = {
    tradeGoodSupplies: Record<TradeGood, number>
    mayPickup: boolean
    templeIcon: IconLayer
};

// TODO: Refactor this as a non-button. Make the SeaZone clickable
export class LocationToken extends Button implements Unique<DynamicGroupInterface<LocationTokenUpdate>> {
    private icon: Konva.Path;
    private id: LocationName;
    private emptyLocation: EmptyLocationToken;
    private tradeGood: TradeGood | null;

    constructor(
        stage: Konva.Stage,
        locationId: LocationName,
        iconData: IconLayer,
        isPlay: boolean,
        loadGoodCallback: (tradeGood: TradeGood) => void,
    ) {
        const elements: ElementList = [];
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
                ? () => { loadGoodCallback(goodToPickup); }
                : null,
        );

        this.id = locationId;
        this.tradeGood = goodToPickup;

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

        if (this.tradeGood)
            elements.push(this.emptyLocation.getElement());

        this.group.add( ...elements);
    }

    public getElement() {
        return this.group;
    }

    public getId(): LocationName {
        return this.id;
    }

    public update(update: LocationTokenUpdate): void {
        if (this.tradeGood) {
            const supply = update.tradeGoodSupplies[this.tradeGood];

            (supply > 0 && update.mayPickup) ? super.enable() : super.disable();
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