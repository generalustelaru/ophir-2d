import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Button, CoinDial, FavorDial } from '../popular';
import clientConstants from '~/client_constants';
import { Coordinates, Unique, BuyMetalsMessage, TreasuryOffer, LoadGoodMessage, TradeGood } from '~/shared_types';
import { TradeGoodFactory } from '.';

const { HUES, CARGO_ITEM_DATA } = clientConstants;
type Update = {
    treasury: TreasuryOffer
    message: BuyMetalsMessage
} | { message: LoadGoodMessage }
export class PurchaseCard extends Button implements Unique<DynamicGroupInterface<Update>> {
    private background: Konva.Rect;
    private useTreasuryColor: boolean = true;
    private tradeGoodTokens: Map<TradeGood, Konva.Group>;
    private coinDial: CoinDial;
    private favorDial: FavorDial;
    private goldIcon: Konva.Path;
    private silverIcon: Konva.Path;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        callback: Function | null,
    ) {
        super(
            stage,
            { width: 66, height: 96, x: position.x, y: position.y },
            callback,
        );

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: HUES.treasuryDarkGold,
            stroke: HUES.boneWhite,
            strokeWidth: 2,
            cornerRadius: 15,
        });

        this.tradeGoodTokens = new Map();
        const symbols: Array<TradeGood> = ['linen', 'ebony', 'gems', 'marble'];
        const tradeGoodFactory = new TradeGoodFactory();

        for (const symbol of symbols) {
            this.tradeGoodTokens.set(
                symbol,
                tradeGoodFactory.produceElement(symbol, 3),
            );
        }

        const tokenGroup = new Konva.Group({ x: 16, y: 40 }).add(...(()=> {
            const nodes: Array<Konva.Group> = [];
            this.tradeGoodTokens.forEach(token => {
                nodes.push(token);
            });
            return nodes;
        })());

        this.coinDial = new CoinDial({ x: this.group.width() / 2, y: 32 }, 0);
        this.favorDial = new FavorDial({ x: 7, y: 7 }, 0);

        const iconConfig = {
            x: 1,
            y: 60,
            scaleX: 2.75,
            scaleY: 2.75,
        };

        this.goldIcon = new Konva.Path({
            ...iconConfig,
            data: CARGO_ITEM_DATA['gold'].shape,
            fill: CARGO_ITEM_DATA['gold'].fill,
        });

        this.silverIcon = new Konva.Path({
            ...iconConfig,
            data: CARGO_ITEM_DATA['silver'].shape,
            fill: CARGO_ITEM_DATA['silver'].fill,
        });

        this.group.add(
            this.background,
            tokenGroup,
            this.goldIcon,
            this.silverIcon,
            this.coinDial.getElement(),
            this.favorDial.getElement(),
        );

        this.hideElements();
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(data: Update): void {
        this.hideElements();

        if ('treasury' in data) {
            const { message, treasury } = data;
            const { currency, metal } = message.payload;
            const dialRef = currency == 'coins' ? this.coinDial : this.favorDial;
            const { iconRef, cost } = (() => {
                return metal == 'silver'
                    ? { iconRef: this.silverIcon, cost: treasury.silverCost }
                    : { iconRef: this.goldIcon, cost: treasury.goldCost };
            })();

            dialRef.update(cost[currency]);
            dialRef.show();
            iconRef.visible(true);
            this.background.fill(HUES.treasuryDarkGold);
            this.useTreasuryColor = true;
        } else {
            this.background.fill(HUES.islandGreen);
            this.tradeGoodTokens.get(data.message.payload.tradeGood)?.show();
            this.useTreasuryColor = false;
        }

        super.disable();
    }

    public setFeasable(isFeasable: boolean) {
        isFeasable ? super.enable() : super.disable();

        if (this.useTreasuryColor)
            this.background.fill(isFeasable ? HUES.treasuryGold : HUES.treasuryDarkGold);
        else
            this.background.fill(isFeasable ? HUES.islandLightGreen: HUES.islandGreen);
    }

    private hideElements() {
        this.favorDial.hide();
        this.coinDial.hide();
        this.goldIcon.visible(false);
        this.silverIcon.visible(false);
        this.tradeGoodTokens.forEach(token => token.hide());
    }
}