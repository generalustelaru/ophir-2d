import Konva from "konva";
import { DynamicGroupInterface, ExchangeCardUpdate } from "../../client_types";
import { ActionButton } from "../ActionButton";
import { CoinDial, FavorDial } from "../GroupList";
import clientConstants from "../../client_constants";
import { Coordinates } from "../../../shared_types";

const { COLOR, CARGO_ITEM_DATA } = clientConstants;
export class ExchangeCard extends ActionButton implements DynamicGroupInterface<ExchangeCardUpdate> {
    private background: Konva.Rect;
    private currencyDial: CoinDial | FavorDial;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        update: ExchangeCardUpdate
    ) {
        super(
            stage,
            {
                width: 66,
                height: 96,
                x: position.x,
                y: position.y,
            },
            {
                action: 'buy_metals',
                details: { metal: update.exchange.metal, currency: update.exchange.currency }
            });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.exchangeDarkGold,
            stroke: COLOR.boneWhite,
            strokeWidth: 2,
            cornerRadius: 15,
        });

        this.currencyDial = update.exchange.currency === 'coins'
            ? new CoinDial({ x: this.group.width() / 2, y: 32 }, update.exchange.amount)
            : new FavorDial({ x: 7, y: 7 }, update.exchange.amount);

        const metalIcon = new Konva.Path({
            data: CARGO_ITEM_DATA[update.exchange.metal].shape,
            fill: CARGO_ITEM_DATA[update.exchange.metal].fill,
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
    public updateElement(data: ExchangeCardUpdate): void {
        this.currencyDial.updateElement(data.exchange.amount);
        const isFeasible = (data.playerAmounts
            ? data.exchange.amount <= data.playerAmounts[data.exchange.currency]
            : false
        );
        this.setEnabled(isFeasible);
        this.background.fill(isFeasible ? COLOR.exchangeGold : COLOR.exchangeDarkGold);
    }
}