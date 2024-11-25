import Konva from 'konva';
import { DynamicGroupInterface, ExchangeUpdate, GroupLayoutData } from '../../client_types';
import clientConstants from '../../client_constants';
import { CargoManifest } from '../../../shared_types';
import { ExchangeCard } from './ExchangeCard';

const { COLOR } = clientConstants;

export class ExchangePlacard implements DynamicGroupInterface<ExchangeUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private goldForFavorCard: ExchangeCard;
    private silverForFavorCard: ExchangeCard;
    private goldForCoinsCard: ExchangeCard;
    private silverForCoinsCard: ExchangeCard;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        update: ExchangeUpdate,
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
            fill: COLOR.exchangeDarkGold,
            cornerRadius: 15,
            visible: false,
        });

        const playerAmounts = update.localPlayer && {
            coins: update.localPlayer.coins,
            favor: update.localPlayer.favor,
        }

        const leftmargin = 10;
        const cardWidth = 66;

        this.goldForFavorCard = new ExchangeCard(
            stage,
            { x: 0, y: 0 },
            {
                playerAmounts,
                exchange: {
                    currency: 'favor',
                    amount: update.templeLevel.goldCost.favor,
                    metal: 'gold',
                }
            }
        );

        this.silverForFavorCard = new ExchangeCard(
            stage,
            { x: cardWidth + leftmargin, y: 0 },
            {
                playerAmounts,
                exchange: {
                    currency: 'favor',
                    amount: update.templeLevel.silverCost.favor,
                    metal: 'silver',
                }
            }
        );

        this.goldForCoinsCard = new ExchangeCard(
            stage,
            { x: cardWidth * 2 + leftmargin * 2, y: 0 },
            {
                playerAmounts,
                exchange: {
                    currency: 'coins',
                    amount: update.templeLevel.goldCost.coins,
                    metal: 'gold',
                }
            }
        );

        this.silverForCoinsCard = new ExchangeCard(
            stage,
            { x: cardWidth * 3 + leftmargin * 3, y: 0 },
            {
                playerAmounts,
                exchange: {
                    currency: 'coins',
                    amount: update.templeLevel.silverCost.coins,
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

    public updateElement(update: ExchangeUpdate): void {

        const playerCanAct = (
            update.localPlayer?.locationActions?.includes('buy_metals')
            && update.localPlayer.isAnchored
            && this.hasCargoRoom(update.localPlayer.cargo)
        );

        const playerAmounts = playerCanAct ? {
            coins: update.localPlayer!.coins,
            favor: update.localPlayer!.favor,
        } : null;

        this.goldForFavorCard.updateElement({
            playerAmounts,
            exchange: {
                currency: 'favor',
                amount: update.templeLevel.goldCost.favor,
                metal: 'gold',
            }
        });
        this.silverForFavorCard.updateElement({
            playerAmounts,
            exchange: {
                currency: 'favor',
                amount: update.templeLevel.silverCost.favor,
                metal: 'silver',
            }
        });
        this.goldForCoinsCard.updateElement({
            playerAmounts,
            exchange: {
                currency: 'coins',
                amount: update.templeLevel.goldCost.coins,
                metal: 'gold',
            }
        });
        this.silverForCoinsCard.updateElement({
            playerAmounts,
            exchange: {
                currency: 'coins',
                amount: update.templeLevel.silverCost.coins,
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