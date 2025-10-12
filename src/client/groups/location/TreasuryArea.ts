import Konva from 'konva';
import { DynamicGroupInterface, TreasuryUpdate, GroupLayoutData } from "~/client_types";
import clientConstants from "~/client_constants";
import { Action, ItemName } from "~/shared_types";
import { TreasuryCard } from './TreasuryCard';

const { COLOR } = clientConstants;

export class TreasuryArea implements DynamicGroupInterface<TreasuryUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private goldForFavorCard: TreasuryCard;
    private silverForFavorCard: TreasuryCard;
    private goldForCoinsCard: TreasuryCard;
    private silverForCoinsCard: TreasuryCard;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        update: TreasuryUpdate,
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

        const playerAmounts = update.localPlayer && {
            coins: update.localPlayer.coins,
            favor: update.localPlayer.favor,
        }

        const leftmargin = 10;
        const cardWidth = 66;

        this.goldForFavorCard = new TreasuryCard(
            stage,
            { x: 0, y: 0 },
            {
                playerAmounts,
                treasury: {
                    currency: 'favor',
                    price: update.tier.goldCost.favor,
                    metal: 'gold',
                    supply: update.metalSupplies.gold,
                }
            }
        );

        this.silverForFavorCard = new TreasuryCard(
            stage,
            { x: cardWidth + leftmargin, y: 0 },
            {
                playerAmounts,
                treasury: {
                    currency: 'favor',
                    price: update.tier.silverCost.favor,
                    metal: 'silver',
                    supply: update.metalSupplies.silver,
                }
            }
        );

        this.goldForCoinsCard = new TreasuryCard(
            stage,
            { x: cardWidth * 2 + leftmargin * 2, y: 0 },
            {
                playerAmounts,
                treasury: {
                    currency: 'coins',
                    price: update.tier.goldCost.coins,
                    metal: 'gold',
                    supply: update.metalSupplies.gold,
                }
            }
        );

        this.silverForCoinsCard = new TreasuryCard(
            stage,
            { x: cardWidth * 3 + leftmargin * 3, y: 0 },
            {
                playerAmounts,
                treasury: {
                    currency: 'coins',
                    price: update.tier.silverCost.coins,
                    metal: 'silver',
                    supply: update.metalSupplies.silver,
                }
            }
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
        const { localPlayer } = update;
        const playerCanAct = (
            localPlayer?.locationActions.includes(Action.buy_metals)
            && localPlayer.turnPurchases < 2
            && localPlayer.isAnchored
            && this.hasCargoRoom(localPlayer.cargo)
        );

        const playerAmounts = playerCanAct ? {
            coins: localPlayer!.coins,
            favor: localPlayer!.favor,
        } : null;

        this.goldForFavorCard.update({
            playerAmounts,
            treasury: {
                currency: 'favor',
                price: update.tier.goldCost.favor,
                metal: 'gold',
                supply: update.metalSupplies.gold,
            }
        });
        this.silverForFavorCard.update({
            playerAmounts,
            treasury: {
                currency: 'favor',
                price: update.tier.silverCost.favor,
                metal: 'silver',
                supply: update.metalSupplies.silver,
            }
        });
        this.goldForCoinsCard.update({
            playerAmounts,
            treasury: {
                currency: 'coins',
                price: update.tier.goldCost.coins,
                metal: 'gold',
                supply: update.metalSupplies.gold,
            }
        });
        this.silverForCoinsCard.update({
            playerAmounts,
            treasury: {
                currency: 'coins',
                price: update.tier.silverCost.coins,
                metal: 'silver',
                supply: update.metalSupplies.silver,
            }
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    private hasCargoRoom(cargo: Array<ItemName>): boolean {
        const emptySlots = cargo.filter(item => item === 'empty').length;

        return emptySlots >= 2;
    }

    public disable(): void {
        this.goldForFavorCard.disable();
        this.silverForFavorCard.disable();
        this.goldForCoinsCard.disable();
        this.silverForCoinsCard.disable();
    }
}
