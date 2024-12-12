import Konva from 'konva';
import { DynamicGroupInterface, TreasuryUpdate, GroupLayoutData } from '../../client_types';
import clientConstants from '../../client_constants';
import { CargoManifest } from '../../../shared_types';
import { TreasuryCard } from './TreasuryCard';

const { COLOR } = clientConstants;

export class TreasuryPlacard implements DynamicGroupInterface<TreasuryUpdate> {

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
                    amount: update.metalPrices.goldCost.favor,
                    metal: 'gold',
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
                    amount: update.metalPrices.silverCost.favor,
                    metal: 'silver',
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
                    amount: update.metalPrices.goldCost.coins,
                    metal: 'gold',
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
                    amount: update.metalPrices.silverCost.coins,
                    metal: 'silver',
                }
            }
        );

        this.group.add(...[
            this.background,
            this.goldForFavorCard.getElement(),
            this.silverForFavorCard.getElement(),
            this.goldForCoinsCard.getElement(),
            this.silverForCoinsCard.getElement(),
        ]);
    }

    public update(update: TreasuryUpdate): void {

        const playerCanAct = (
            update.localPlayer?.locationActions?.includes('buy_metals')
            && update.localPlayer.isAnchored
            && this.hasCargoRoom(update.localPlayer.cargo)
        );

        const playerAmounts = playerCanAct ? {
            coins: update.localPlayer!.coins,
            favor: update.localPlayer!.favor,
        } : null;

        this.goldForFavorCard.update({
            playerAmounts,
            treasury: {
                currency: 'favor',
                amount: update.metalPrices.goldCost.favor,
                metal: 'gold',
            }
        });
        this.silverForFavorCard.update({
            playerAmounts,
            treasury: {
                currency: 'favor',
                amount: update.metalPrices.silverCost.favor,
                metal: 'silver',
            }
        });
        this.goldForCoinsCard.update({
            playerAmounts,
            treasury: {
                currency: 'coins',
                amount: update.metalPrices.goldCost.coins,
                metal: 'gold',
            }
        });
        this.silverForCoinsCard.update({
            playerAmounts,
            treasury: {
                currency: 'coins',
                amount: update.metalPrices.silverCost.coins,
                metal: 'silver',
            }
        });
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    private hasCargoRoom(cargo: CargoManifest): boolean {
        const emptySlots = cargo.filter(item => item === 'empty').length;

        return emptySlots >= 2;
    }
}