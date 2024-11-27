import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData, TempleUpdate } from "../../client_types";
import clientConstants from "../../client_constants";
import { MarketKey, MarketOffer } from "../../../shared_types";
import { UpgradeButton, TempleMarketCard } from "../GroupList";

const { COLOR } = clientConstants;

export class TemplePlacard implements DynamicGroupInterface<TempleUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private upgradeButton: UpgradeButton;
    private marketCard: TempleMarketCard;
    private templeTradeSlot: MarketKey;

    constructor(
        stage: Konva.Stage,
        marketSlot: MarketKey,
        market: MarketOffer,
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

        this.group.add(...[
            this.background,
            this.marketCard.getElement(),
            this.upgradeButton.getElement(),
        ]);
    }

    public updateElement(data: TempleUpdate): void {
        const localPlayer = data.localPlayer;

        this.marketCard.updateElement({
            trade: data.trade,
            isFeasible: (
                !!localPlayer?.feasibleTrades.includes(this.templeTradeSlot)
                && !!localPlayer.locationActions?.includes('donate_goods')
                && localPlayer.isAnchored
            )
        });

        this.upgradeButton.updateElement((
            !!localPlayer?.locationActions?.includes('upgrade_hold')
            && localPlayer.isAnchored
            && localPlayer.coins >= 2
            && localPlayer.cargo.length < 4
        ));
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}