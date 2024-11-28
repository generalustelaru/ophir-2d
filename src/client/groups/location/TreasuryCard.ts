import Konva from "konva";
import { DynamicGroupInterface, TreasuryCardUpdate } from "../../client_types";
import { ActionButton } from "../ActionButton";
import { CoinDial, FavorDial } from "../GroupList";
import clientConstants from "../../client_constants";
import { Coordinates } from "../../../shared_types";

const { COLOR, CARGO_ITEM_DATA } = clientConstants;

export class TreasuryCard extends ActionButton implements DynamicGroupInterface<TreasuryCardUpdate> {
    private background: Konva.Rect;
    private currencyDial: CoinDial | FavorDial;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        update: TreasuryCardUpdate
    ) {
        super(
            stage,
            { width: 66, height: 96, x: position.x, y: position.y },
            {
                action: 'buy_metals',
                details: { metal: update.treasury.metal, currency: update.treasury.currency }
            });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.treasuryDarkGold,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
            cornerRadius: 15,
        });

        this.currencyDial = update.treasury.currency === 'coins'
            ? new CoinDial({ x: this.group.width() / 2, y: 32 }, update.treasury.amount)
            : new FavorDial({ x: 7, y: 7 }, update.treasury.amount);

        const metalIcon = new Konva.Path({
            data: CARGO_ITEM_DATA[update.treasury.metal].shape,
            fill: CARGO_ITEM_DATA[update.treasury.metal].fill,
            x: 1,
            y: 60,
            scaleX: 2.75,
            scaleY: 2.75,
        });

        this.group.add(...[
            this.background,
            metalIcon,
            this.currencyDial.getElement(),
        ])
    }

    public getElement(): Konva.Group {
        return this.group;
    }
    public updateElement(data: TreasuryCardUpdate): void {
        this.currencyDial.updateElement(data.treasury.amount);
        const isFeasible = (data.playerAmounts
            ? data.treasury.amount <= data.playerAmounts[data.treasury.currency]
            : false
        );
        this.setEnabled(isFeasible);
        this.background.fill(isFeasible ? COLOR.treasuryGold : COLOR.treasuryDarkGold);
    }
}