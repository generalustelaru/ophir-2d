import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData, TempleUpdate, Unique } from '~/client_types';
import clientConstants from '~/client_constants';
import { MarketSlotKey, MarketOffer, Action } from '~/shared_types';
import { UpgradeButton, TempleMarketCard, MetalDonationCard, MetalDonationsBand } from '.';

const { COLOR } = clientConstants;

export class TempleArea implements Unique<DynamicGroupInterface<TempleUpdate>> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private upgradeButton: UpgradeButton;
    private marketCard: TempleMarketCard;
    private goldDonationCard: MetalDonationCard;
    private silverDonationCard: MetalDonationCard;
    private donationsBand: MetalDonationsBand;

    constructor(
        stage: Konva.Stage,
        marketSlot: MarketSlotKey,
        market: MarketOffer,
        layout: GroupLayoutData,
        maxLevel: number,
        donateGoodsCallback: Function,
    ) {
        this.group = new Konva.Group(layout);

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeDarkRed,
            cornerRadius: 15,
            visible: false,
        });

        this.upgradeButton = new UpgradeButton(
            stage,
            {
                width: 80,
                height: 30 + 10,
                x: layout.width - 85,
                y: layout.height - 51,
            },
        );

        const card = market[marketSlot];
        const margin = 10;
        const donationCardDrift = 26;
        const donationCardWidth = 66;

        this.marketCard = new TempleMarketCard(
            stage,
            { x: this.group.width() - 62 - margin, y: 10 },
            card,
            () => donateGoodsCallback(marketSlot),
        );

        this.goldDonationCard = new MetalDonationCard(
            stage,
            { x: margin + donationCardDrift, y: 10 },
            'gold',
            false,
        );

        this.silverDonationCard = new MetalDonationCard(
            stage,
            { x: margin * 2 + donationCardDrift + donationCardWidth, y: 10 },
            'silver',
            false,
        );

        this.donationsBand = new MetalDonationsBand(
            { x: 26, y: 120 },
            maxLevel,
        );

        this.group.add(...[
            this.background,
            this.marketCard.getElement(),
            this.upgradeButton.getElement(),
            this.goldDonationCard.getElement(),
            this.silverDonationCard.getElement(),
            this.donationsBand.getElement(),
        ]);
    }

    public update(data: TempleUpdate): void {
        const player = data.localPlayer;

        this.marketCard.update({
            trade: data.trade,
            isFeasible: !!player?.locationActions.includes(Action.donate_goods),
        });

        this.upgradeButton.update(
            !!player?.locationActions.includes(Action.upgrade_cargo),
        );

        const playerCanDonateMetals = (
            !!player?.locationActions.includes(Action.donate_metal)
        );

        this.goldDonationCard.update((
            playerCanDonateMetals
            && !!player?.cargo.find(item => item === 'gold')
        ));

        this.silverDonationCard.update((
            playerCanDonateMetals
            && !!player?.cargo.find(item => item === 'silver')
        ));

        this.donationsBand.update(data.templeStatus);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public disable(): void {
        this.marketCard.disable();
        this.upgradeButton.disable();
        this.goldDonationCard.disable();
        this.silverDonationCard.disable();
    }
}
