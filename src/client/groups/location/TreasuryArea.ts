import Konva from 'konva';
import { DynamicGroupInterface, TreasuryUpdate, GroupLayoutData, Unique } from '~/client_types';
import clientConstants from '~/client_constants';
import { Action } from '~/shared_types';
import { TreasuryCard } from './TreasuryCard';

const { COLOR } = clientConstants;

export class TreasuryArea implements Unique<DynamicGroupInterface<TreasuryUpdate>> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private goldForFavorCard: TreasuryCard;
    private silverForFavorCard: TreasuryCard;
    private goldForCoinsCard: TreasuryCard;
    private silverForCoinsCard: TreasuryCard;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.treasuryDarkGold,
            cornerRadius: 15,
            visible: false,
        });

        const leftmargin = 10;
        const cardWidth = 66;

        this.goldForFavorCard = new TreasuryCard(
            stage,
            { x: 0, y: 0 },
            { currency: 'favor', metal: 'gold' },
        );

        this.silverForFavorCard = new TreasuryCard(
            stage,
            { x: cardWidth + leftmargin, y: 0 },
            { currency: 'favor', metal: 'silver' },
        );

        this.goldForCoinsCard = new TreasuryCard(
            stage,
            { x: cardWidth * 2 + leftmargin * 2, y: 0 },
            { currency: 'coins', metal: 'gold' },
        );

        this.silverForCoinsCard = new TreasuryCard(
            stage,
            { x: cardWidth * 3 + leftmargin * 3, y: 0 },
            { currency: 'coins', metal: 'silver' },
        );

        this.group.add(
            this.background,
            this.goldForFavorCard.getElement(),
            this.silverForFavorCard.getElement(),
            this.goldForCoinsCard.getElement(),
            this.silverForCoinsCard.getElement(),
        );
    }

    public update(update: TreasuryUpdate): void {
        const { localPlayer, treasury: tier, metalSupplies } = update;
        const feasiblePurchases =
            localPlayer?.locationActions.includes(Action.buy_metal)
            && localPlayer.feasiblePurchases || [];

        this.goldForFavorCard.update({
            feasiblePurchases,
            price: tier.goldCost,
            supply: metalSupplies.gold,
        });
        this.silverForFavorCard.update({
            feasiblePurchases,
            price: tier.silverCost,
            supply: metalSupplies.silver,
        });
        this.goldForCoinsCard.update({
            feasiblePurchases,
            price: tier.goldCost,
            supply: metalSupplies.gold,
        });
        this.silverForCoinsCard.update({
            feasiblePurchases,
            price: tier.silverCost,
            supply: metalSupplies.silver,
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public disable(): void {
        this.goldForFavorCard.disable();
        this.silverForFavorCard.disable();
        this.goldForCoinsCard.disable();
        this.silverForCoinsCard.disable();
    }
}
