import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData, TempleUpdate } from "../../client_types";
import clientConstants from "../../client_constants";
import { MarketSlotKey, MarketOffer } from "../../../shared_types";
import { UpgradeButton, TempleMarketCard, TempleDonationCard, MetalDonationsBand } from "../GroupList";

const { COLOR } = clientConstants;

export class TemplePlacard implements DynamicGroupInterface<TempleUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private upgradeButton: UpgradeButton;
    private marketCard: TempleMarketCard;
    private templeTradeSlot: MarketSlotKey;
    private goldDonationCard: TempleDonationCard;
    private silverDonationCard: TempleDonationCard;
    private donationsBand: MetalDonationsBand;

    constructor(
        stage: Konva.Stage,
        marketSlot: MarketSlotKey,
        market: MarketOffer,
        layout: GroupLayoutData,
        maxLevel: number,
    ) {

        this.group = new Konva.Group(layout);

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeDarkBlue,
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
            }
        );

        const card = market[marketSlot];
        const margin = 10;
        const donationCardDrift = 26;
        const donationCardWidth = 66;

        this.marketCard = new TempleMarketCard(
            stage,
            { x: this.group.width() - 62 - margin, y: 10 },
            { action: 'trade', payload: { slot: marketSlot, location: 'temple' } },
            card,
        );
        this.templeTradeSlot = marketSlot;

        this.goldDonationCard = new TempleDonationCard(
            stage,
            { x: margin + donationCardDrift, y: 10 },
            'gold',
            false,
        );

        this.silverDonationCard = new TempleDonationCard(
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
        const localPlayer = data.localPlayer;
        const playerCanAct = (
            !!localPlayer
            && localPlayer.isAnchored
            && !!localPlayer.locationActions
        );

        this.marketCard.update({
            trade: data.trade,
            isFeasible: (
                playerCanAct
                && localPlayer.bearings.location === 'temple'
                && localPlayer.feasibleTrades.includes(this.templeTradeSlot)
                && !!localPlayer.locationActions?.includes('trade_goods')
            )
        });

        this.upgradeButton.update((
            playerCanAct
            && !!localPlayer.locationActions?.includes('upgrade_hold')
            && localPlayer.coins >= 2
            && localPlayer.cargo.length < 4
        ));

        const playerCanDonateMetals = (
            playerCanAct && !!localPlayer.locationActions?.includes('donate_metals')
        );

        this.goldDonationCard.update((
            playerCanDonateMetals
            && !!localPlayer.cargo.find(item => item === 'gold')
        ));

        this.silverDonationCard.update((
            playerCanDonateMetals
            && !!localPlayer.cargo.find(item => item === 'silver')
        ));

        this.donationsBand.update(data.templeStatus);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public disable(): void {
        this.marketCard.disableAction();
        this.upgradeButton.disableAction();
        this.goldDonationCard.disableAction();
        this.silverDonationCard.disableAction();
    }
}