import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData, TempleUpdate } from "../../client_types";
import clientConstants from "../../client_constants";
import { MarketKey, MarketOffer } from "../../../shared_types";
import { UpgradeButton, TempleCard } from "../GroupList";

const { COLOR } = clientConstants;

export class TemplePlacard implements DynamicGroupInterface<TempleUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private upgradeButton: UpgradeButton;
    private templeCard: TempleCard;

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
        const cardWidth = this.group.width() / 4;
        const cardHeight = this.group.height() / 6 * 4;

        this.templeCard = new TempleCard(
            stage,
            {
                width: cardWidth,
                height: cardHeight,
                x: this.group.width() - cardWidth - 10,
                y: 10,
            },
            { action: 'donate_goods', details: { slot: marketSlot } },
            card,
        );
        this.templeTradeSlot = marketSlot;

        this.group.add(...[
            this.background,
            this.templeCard.getElement(),
            this.upgradeButton.getElement(),
        ]);
    }

    public updateElement(data: TempleUpdate): void {
        const localPlayer = data.localPlayer;

        this.templeCard.updateElement({
            contract: data.contract,
            isFeasible: (
                !!localPlayer?.feasibleContracts.includes(this.templeTradeSlot)
                && !!localPlayer.locationActions?.includes('donate_goods')
            )
        });

        this.upgradeButton.updateElement((
            !!localPlayer?.locationActions?.includes('upgrade_hold')
            && localPlayer.coins >= 2
            && localPlayer.cargo.length < 4
        ));
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}