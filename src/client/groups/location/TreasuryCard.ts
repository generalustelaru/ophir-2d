import Konva from 'konva';
import { DynamicGroupInterface, TreasuryCardUpdate } from '~/client_types';
import { RequestButton, CoinDial, FavorDial } from '../popular';
import clientConstants from '~/client_constants';
import { Coordinates, Action, MetalPurchasePayload, Metal, Currency, Unique } from '~/shared_types';

const { HUES, CARGO_ITEM_DATA } = clientConstants;

export class TreasuryCard extends RequestButton implements Unique<DynamicGroupInterface<TreasuryCardUpdate>> {
    private background: Konva.Rect;
    private currencyDial: CoinDial | FavorDial;
    private metalType: Metal;
    private currencyType: Currency;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        payload: MetalPurchasePayload,
    ) {
        super(
            stage,
            { width: 66, height: 96, x: position.x, y: position.y },
            { action: Action.buy_metal, payload },
        );

        this.metalType = payload.metal;
        this.currencyType = payload.currency;

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: HUES.treasuryDarkGold,
            stroke: HUES.boneWhite,
            strokeWidth: 2,
            cornerRadius: 15,
        });

        this.currencyDial = payload.currency === 'coins'
            ? new CoinDial({ x: this.group.width() / 2, y: 32 }, 0)
            : new FavorDial({ x: 7, y: 7 }, 0);

        const metalIcon = new Konva.Path({
            data: CARGO_ITEM_DATA[payload.metal].shape,
            fill: CARGO_ITEM_DATA[payload.metal].fill,
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
    public update(data: TreasuryCardUpdate): void {
        this.currencyDial.update(data.price[this.currencyType]);
        const isFeasible = Boolean(data.feasiblePurchases.find(
            req => req.metal == this.metalType && req.currency == this.currencyType,
        ));

        this.setEnabled(isFeasible);
        this.background.fill(isFeasible ? HUES.treasuryGold : HUES.treasuryDarkGold);
    }
}