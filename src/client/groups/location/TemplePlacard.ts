import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData, TempleUpdate } from "../../client_types";
import clientConstants from "../../client_constants";
import { MarketKey, MarketOffer } from "../../../shared_types";
import { UpgradeButton, TempleMarketCard, TempleDonationCard } from "../GroupList";
import { MetalDonationsDial } from "./MetalDonationsDial";


const { COLOR } = clientConstants;

export class TemplePlacard implements DynamicGroupInterface<TempleUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private upgradeButton: UpgradeButton;
    private marketCard: TempleMarketCard;
    private templeTradeSlot: MarketKey;
    private goldDonationCard: TempleDonationCard;
    private silverDonationCard: TempleDonationCard;
    private donationsDial: MetalDonationsDial;

    constructor(
        stage: Konva.Stage,
        marketSlot: MarketKey,
        market: MarketOffer,
        layout: GroupLayoutData,
        playerCount: number,
    ) {

        this.group = new Konva.Group(layout);

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeDarkBlue,
            cornerRadius: 15,
        });

        this.upgradeButton = new UpgradeButton(
            stage,
            {
                width: 80,
                height: 30 + 10,
                x: layout.width - 90,
                y: layout.height - 25 - 20,
            }
        );

        const card = market[marketSlot];
        const margin = 10;

        this.marketCard = new TempleMarketCard(
            stage,
            { x: this.group.width() - this.group.width() / 4 - margin + 3, y: 10 },
            { action: 'donate_goods', details: { slot: marketSlot } },
            card,
        );
        this.templeTradeSlot = marketSlot;

        this.goldDonationCard = new TempleDonationCard(
            stage,
            { x: margin, y: 10 },
            'gold',
            false,
        );

        this.silverDonationCard = new TempleDonationCard(
            stage,
            { x: margin + 76, y: 10 },
            'silver',
            false,
        );

        this.donationsDial = new MetalDonationsDial(
            { x: 10, y: 105 },
            playerCount,
        );

        this.group.add(...[
            this.background,
            this.marketCard.getElement(),
            this.upgradeButton.getElement(),
            this.goldDonationCard.getElement(),
            this.silverDonationCard.getElement(),
            this.donationsDial.getElement(),
        ]);
    }

    public updateElement(data: TempleUpdate): void {
        const localPlayer = data.localPlayer;
        const playerCanAct = (
            !!localPlayer
            && localPlayer.isAnchored
        );

        this.marketCard.updateElement({
            trade: data.trade,
            isFeasible: (
                playerCanAct
                && !!localPlayer.feasibleTrades.includes(this.templeTradeSlot)
                && !!localPlayer.locationActions?.includes('donate_goods')
            )
        });

        this.upgradeButton.updateElement((
            playerCanAct
            && !!localPlayer.locationActions?.includes('upgrade_hold')
            && localPlayer.coins >= 2
            && localPlayer.cargo.length < 4
        ));

        const playerCanDonate = playerCanAct && !!localPlayer.locationActions?.includes('donate_goods');

        this.goldDonationCard.updateElement((
            playerCanDonate
            && !!localPlayer.cargo.find(item => item === 'gold')
        ));

        this.silverDonationCard.updateElement((
            playerCanDonate
            && !!localPlayer.cargo.find(item => item === 'silver')
        ));

        this.donationsDial.updateElement(data.templeStatus);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}