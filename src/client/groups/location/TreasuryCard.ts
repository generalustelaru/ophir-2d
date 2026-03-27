import Konva from 'konva';
import { DynamicGroupInterface, TreasuryCardUpdate } from '~/client_types';
import { CoinDial, FavorDial, Button } from '../popular';
import clientConstants from '~/client_constants';
import { Coordinates, MetalPurchasePayload, Metal, Currency, Unique } from '~/shared_types';
import { fade } from '~/client/animations';

const { HUES, CARGO_ITEM_DATA } = clientConstants;

export class TreasuryCard extends Button implements Unique<DynamicGroupInterface<TreasuryCardUpdate>> {
    private background: Konva.Rect;
    private currencyDial: CoinDial | FavorDial;
    private metalType: Metal;
    private currencyType: Currency;
    private currentValue: number | null = null;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        data: MetalPurchasePayload,
        purchaseCallback: (payload: MetalPurchasePayload) => void,
    ) {
        super(
            stage,
            { width: 66, height: 96, x: position.x, y: position.y },
            () => { purchaseCallback(data); },
        );

        this.metalType = data.metal;
        this.currencyType = data.currency;
        const isCoinCard = this.currencyType == 'coins';

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: HUES.treasuryDarkGold,
            stroke: HUES.boneWhite,
            strokeWidth: 2,
            cornerRadius: isCoinCard ? 15 : 5,
        });

        this.currencyDial = isCoinCard
            ? new CoinDial({ x: this.group.width() / 2, y: 32 }, 0)
            : new FavorDial({ x: 7, y: 7 }, 0);

        const metalIcon = new Konva.Path({
            data: CARGO_ITEM_DATA[data.metal].shape,
            fill: CARGO_ITEM_DATA[data.metal].fill,
            x: 1,
            y: 60,
            scaleX: 2.75,
            scaleY: 2.75,
        });

        this.group.add(
            this.background,
            metalIcon,
            this.currencyDial.getElement(),
        );
    }

    public getElement(): Konva.Group {
        return this.group;
    }
    public async update(data: TreasuryCardUpdate): Promise<void> {
        const value = data.price[this.currencyType];
        const isPriceIncrease = Boolean(this.currentValue && this.currentValue != value);
        this.currentValue = value;

        isPriceIncrease && await fade(this.group, 1, 0);

        this.currencyDial.update(data.price[this.currencyType]);
        const isFeasible = Boolean(data.feasiblePurchases.find(
            req => req.metal == this.metalType && req.currency == this.currencyType,
        ));

        isFeasible ? super.enable() : super.disable();
        this.background.fill(isFeasible ? HUES.treasuryGold : HUES.treasuryDarkGold);

        isPriceIncrease && fade(this.group, 1, 1);
    }
}